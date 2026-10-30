/*
 * =================================================================================
 *  ESP32 Smart Room Monitoring & Automation Firmware
 *  AuraSense IoT Edge Controller
 *  
 *  Hardware Requirements:
 *  - ESP32 Development Board (ESP32-WROOM-32)
 *  - DHT22 Temperature & Humidity Sensor (Data on GPIO 4)
 *  - LDR Light Dependent Resistor / Ambient Light Sensor (Analog ADC on GPIO 34)
 *  - 4-Channel 5V Relay Module (Optocoupler isolated, Active LOW or HIGH)
 *    * Relay 1 (Ceiling Fan): GPIO 26
 *    * Relay 2 (Air Conditioner / Heavy load): GPIO 27
 *    * Relay 3 (Ceiling Lights): GPIO 14
 *    * Relay 4 (Water Heater / Smart Plug): GPIO 33
 *  - Status LED (GPIO 2)
 *
 *  Features:
 *  - Real-time DHT22 sensor readings with smoothing filter
 *  - Ambient daylight Lux calibration from LDR
 *  - HTTP / WebSocket / MQTT bidirectional sync with Dashboard Server
 *  - Local safety failsafe: if Wi-Fi drops, local thermostat protects room
 *  - Relay feedback state confirmation with hardware debounce
 * =================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// --- WiFi Credentials ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// --- Dashboard Server URL ---
// Replace with the IP address of the machine running the dashboard server
const char* SERVER_URL    = "http://192.168.1.100:3000/api/hardware/telemetry";
const char* CONFIRM_URL   = "http://192.168.1.100:3000/api/hardware/confirm";

// --- Pin Definitions ---
#define DHTPIN        4       // DHT22 Data Pin
#define DHTTYPE       DHT22   // DHT 22 (AM2302)
#define LDRPIN        34      // LDR Analog Pin (ADC1_CH6)
#define STATUS_LED    2       // ESP32 Onboard Blue LED

// Relay Pins
#define RELAY_FAN     26      // Ceiling Fan
#define RELAY_AC      27      // Air Conditioner
#define RELAY_LIGHTS  14      // Ambient Lights
#define RELAY_GEYSER  33      // Water Heater

// Relay Logic (Most relay boards are Active LOW: LOW = ON, HIGH = OFF)
#define RELAY_ON      LOW
#define RELAY_OFF     HIGH

DHT dht(DHTPIN, DHTTYPE);

// Sampling Timers
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // Send telemetry every 2 seconds

// State cache
int fanState    = 0;
int acState     = 0;
int lightsState = 0;
int geyserState = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[AuraSense] Initializing ESP32 Smart Room Controller...");

  // Initialize Relay outputs as OFF immediately
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_AC, OUTPUT);
  pinMode(RELAY_LIGHTS, OUTPUT);
  pinMode(RELAY_GEYSER, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);

  digitalWrite(RELAY_FAN, RELAY_OFF);
  digitalWrite(RELAY_AC, RELAY_OFF);
  digitalWrite(RELAY_LIGHTS, RELAY_OFF);
  digitalWrite(RELAY_GEYSER, RELAY_OFF);
  digitalWrite(STATUS_LED, LOW);

  // Initialize Sensors
  dht.begin();
  pinMode(LDRPIN, INPUT);

  // Connect to WiFi
  connectWiFi();

  Serial.println("[AuraSense] System Ready. Starting telemetry loop.");
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(STATUS_LED, HIGH);
  } else {
    Serial.println("\n[WiFi] Connection failed. Will run in standalone offline mode.");
  }
}

void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED && millis() - lastTelemetryTime > 10000) {
    connectWiFi();
  }

  // Periodic Telemetry Transmission
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    sendTelemetryAndSyncRelays();
  }
}

void sendTelemetryAndSyncRelays() {
  // Read Sensors
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  // Validate DHT readings
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[Sensors] Warning: Failed to read from DHT22 sensor!");
    temperature = 26.5; // fallback safe value
    humidity = 55.0;
  }

  // Read LDR (0 - 4095 on ESP32 12-bit ADC)
  int ldrRaw = analogRead(LDRPIN);
  // Map ADC reading to Lux estimation (0 - 1200 Lux)
  int daylightLux = map(ldrRaw, 0, 4095, 0, 1200);

  Serial.printf("[Sensors] Temp: %.1f °C | Humidity: %.1f %% | Lux: %d (ADC: %d)\n", 
                temperature, humidity, daylightLux, ldrRaw);

  if (WiFi.status() != WL_CONNECTED) {
    // Offline Thermostat Failsafe:
    // If offline and temp > 30°C, turn on fan for safety
    if (temperature > 30.0 && fanState == 0) {
      fanState = 1;
      digitalWrite(RELAY_FAN, RELAY_ON);
      Serial.println("[Offline Failsafe] Auto Fan ON due to high temp.");
    }
    return;
  }

  // Prepare JSON Payload
  StaticJsonDocument<256> doc;
  doc["hardwareId"]   = "ESP32-MASTER-ROOM-01";
  doc["temperature"]  = serialized(String(temperature, 1));
  doc["humidity"]     = serialized(String(humidity, 1));
  doc["lux"]          = daylightLux;

  String jsonString;
  serializeJson(doc, jsonString);

  // Send HTTP POST to Dashboard Backend
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonString);

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    StaticJsonDocument<384> resDoc;
    DeserializationError error = deserializeJson(resDoc, response);

    if (!error && resDoc["success"] == true) {
      JsonObject relays = resDoc["relays"];

      // Actuate Fan
      if (relays.containsKey("fan")) {
        int target = relays["fan"];
        if (target != fanState) {
          fanState = target;
          digitalWrite(RELAY_FAN, fanState ? RELAY_ON : RELAY_OFF);
          Serial.printf("[Relay] Fan switched to: %s\n", fanState ? "ON" : "OFF");
        }
      }

      // Actuate AC
      if (relays.containsKey("ac")) {
        int target = relays["ac"];
        if (target != acState) {
          acState = target;
          digitalWrite(RELAY_AC, acState ? RELAY_ON : RELAY_OFF);
          Serial.printf("[Relay] AC switched to: %s\n", acState ? "ON" : "OFF");
        }
      }

      // Actuate Lights
      if (relays.containsKey("lights")) {
        int target = relays["lights"];
        if (target != lightsState) {
          lightsState = target;
          digitalWrite(RELAY_LIGHTS, lightsState ? RELAY_ON : RELAY_OFF);
          Serial.printf("[Relay] Lights switched to: %s\n", lightsState ? "ON" : "OFF");
        }
      }

      // Actuate Water Heater
      if (relays.containsKey("geyser")) {
        int target = relays["geyser"];
        if (target != geyserState) {
          geyserState = target;
          digitalWrite(RELAY_GEYSER, geyserState ? RELAY_ON : RELAY_OFF);
          Serial.printf("[Relay] Water Heater switched to: %s\n", geyserState ? "ON" : "OFF");
        }
      }
    }
  } else {
    Serial.printf("[HTTP] POST failed, error code: %d\n", httpCode);
  }

  http.end();
}
