# Hardware Setup & Pinout Specification

## Overview
This hardware module interfaces an **ESP32 DevKit V1 (30-pin or 38-pin)** with room sensors and high-voltage electrical appliances via an optically isolated relay board.

---

## 1. Wiring & Pinout Table

| Component | Pin on Component | ESP32 GPIO Pin | Function / Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DHT22** | VCC | 3.3V or 5V | Power | Add 10kΩ pull-up resistor between VCC and Data if module lacks one |
| **DHT22** | DATA / OUT | **GPIO 4** | Digital I/O | Temperature & Humidity input |
| **DHT22** | GND | GND | Ground | Common Ground |
| **LDR Sensor** | VCC | 3.3V | Power | Light-dependent resistor voltage divider |
| **LDR Sensor** | A0 / Analog Out | **GPIO 34** | ADC1_CH6 Input | Ambient Light / Lux Detection (0 - 4095) |
| **LDR Sensor** | GND | GND | Ground | Common Ground |
| **Relay 1** (Fan) | IN1 | **GPIO 26** | Digital Output | Active LOW Optocoupler Relay |
| **Relay 2** (AC) | IN2 | **GPIO 27** | Digital Output | Active LOW Optocoupler Relay |
| **Relay 3** (Lights)| IN3 | **GPIO 14** | Digital Output | Active LOW Optocoupler Relay |
| **Relay 4** (Heater)| IN4 | **GPIO 33** | Digital Output | Active LOW Optocoupler Relay (16A/30A rated) |
| **Relay Board** | VCC | 5V (VIN) | Relay Coil Power | Ensure 5V 2A supply for relays |
| **Relay Board** | GND | GND | Common Ground | Tie to ESP32 GND |
| **Status LED** | Onboard | **GPIO 2** | Digital Output | Blinks on WiFi sync |

---

## 2. High-Voltage Electrical Safety Guidelines

> [!CAUTION]
> **MAINS VOLTAGE SAFETY WARNING**:
> Mains electricity (110V - 240V AC) is potentially lethal. All AC wiring should only be done by a qualified electrician or with appropriate isolation precautions.

1. **Relay Contact Ratings**:
   - Standard 10A blue Songle relays are safe up to **1000W - 1200W**.
   - For **Air Conditioners (1.5 Ton)** and **Water Heaters (2000W)**, use a **16A or 30A rated relay module** or an industrial **Contactor** controlled by the ESP32 relay.
2. **Optocoupler Isolation**:
   - Ensure the JD-VCC jumper on the relay board is configured to keep relay coil switching noise isolated from the ESP32 3.3V logic circuit.
3. **Snubber Circuit / MOV**:
   - When switching inductive loads (like Ceiling Fans or AC compressor motors), connect an RC snubber (100Ω + 0.1µF 400V) or Metal Oxide Varistor (MOV) across the relay contacts to suppress inductive kickback and contact arcing.

---

## 3. Communication Architecture

```
[ ESP32 Edge Device ]
  │  (DHT22 & LDR)
  ├── POST /api/hardware/telemetry (Every 2s)
  │    └── Returns { relays: { fan: 1, ac: 0, lights: 1, geyser: 0 } }
  │
  └── POST /api/hardware/confirm (On physical button/relay state change)
       └── { deviceId: "fan", confirmedState: "ON" }
       
[ Node.js Dashboard Server ] ◄──► [ Web Dashboard Browser ]
  (WebSocket ws://localhost:3000)      (Real-time reactive UI)
```
