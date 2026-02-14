# 📡 Ionic BLE Weight Scale App

A real-time mobile application built using **Ionic + Angular** that integrates with a digital weighing machine via **Bluetooth Low Energy (BLE)**.

The app connects to a BLE module attached to a weighing scale, listens to GATT notifications, decodes ASCII weight data, and displays live weight updates in real time.

---

## 🚀 Features

- 🔵 BLE device scanning and connection
- 📡 GATT notification-based data streaming
- 🔢 ASCII weight decoding
- 📊 Real-time weight display (formatted to 2 decimal places)
- 📶 Bluetooth & Internet state monitoring
- 🔄 Auto reconnect handling
- 📱 Android permission handling

---

## 🛠 Tech Stack

- Ionic Framework
- Angular
- TypeScript
- @awesome-cordova-plugins/ble
- Cordova
- Android (BLE support)

---

## ⚙️ How It Works

1. The app scans for available BLE devices.
2. Connects to the configured BLE module.
3. Subscribes to a GATT characteristic using `startNotification()`.
4. Receives ASCII formatted weight data (e.g., `76.94`).
5. Parses and formats weight to `2.00` decimal format.
6. Displays stable real-time weight in the UI.

---

## 📂 Project Structure Note

⚠️ **Important**

The full Android platform folder is NOT included in this repository.

Reason:
The `platforms/android` directory contains a very large number of auto-generated files which exceeded upload limits.

Instead:
- Only the `AndroidManifest.xml` file (containing required BLE permissions) has been uploaded.
- All other Android platform files can be regenerated using Ionic CLI.

---

## 🔄 How To Regenerate Android Platform

After cloning the repository, run:

```bash
npm install
ionic cordova platform add android
