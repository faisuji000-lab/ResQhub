# EPICENTER - ResQHub: Unified Disaster Crisis Management & Autonomous Triage Platform
### Smart India Hackathon 2026 (SIH) | Autonomous Multi-Agency Crisis Management & Emergency Response

**EPICENTER (ResQHub)** is an end-to-end, full-spectrum disaster management and autonomous rescue dispatch ecosystem covering:
1. **📢 INFORM (Pre-Disaster)**: Localized hazard alerts, live weather risk telemetry, NDMA survival checklist.
2. **⚡ ALERT (During Disaster)**: 1-Tap Panic SOS, Shake ×2 Sensor Emergency Trigger, GPS fix, trapped victim count.
3. **🤝 RESPOND (Action & Mobilization)**: "Act as Volunteer" mode (Food, Funds, Physical Rescue, Transport, Medical) and "I Am Safe" Family Registry.
4. **🔄 RECOVER (Post-Disaster)**: Nearby relief camps and 24/7 trauma hospitals with real-time GPS distance and relief supplies.

---

## 🏗️ Core System Architecture (SIH 2026 Resilient Mesh)
```
📱 Edge Sensors (Shake ×2 + GPS)
        ⬇
⚡ Cloud / P2P Relay (Sub-50ms)
        ⬇
🔒 Encrypted Backend (Python 8080)
        ⬇
🚀 Multi-Agency Dispatch (NDRF / SDRF / 108 EMS)
```

---

## 🔒 Security & Access

- **Admin EOC Command Center (`index.html`)**:
  - Protected behind strict Incident Commander Authentication.
  - **User ID**: `ResQhub` *(case-tolerant)*
  - **Password**: `25082007`
  - Real-time incident triage, live Leaflet map, automated audio klaxon siren, and resource allocation.

- **Citizen Mobile Portal (`user.html`)**:
  - **Zero Password / Barrier-Free**: Designed for victims in life-threatening scenarios where every millisecond counts.
  - **Shake ×2 Sensor Trigger**: Detects 2 rapid shakes using mobile accelerometer (`devicemotion`) to trigger SOS without touching the screen.
  - **Exact Second Timestamps**: Every distress beacon records and transmits the exact second it was triggered.
  - **Real-Time Two-Way Dispatch Tracker**: Phone confirms when EOC laptop has dispatched rescue teams (*e.g., NDRF Rapid Boat Squad Alpha*).

---

## 🚀 Getting Started

### 1. Run Locally
Start the Python backend server:
```bash
python server.py
```
- Open Laptop Command Console: `http://localhost:8080/index.html`
- Open Citizen Mobile View: `http://localhost:8080/user.html`

### 2. Public Smartphone Access (Cellular 4G/5G)
To allow smartphones to connect without Wi-Fi over cellular data, launch Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```
Open the generated `trycloudflare.com` URL on any mobile device.

---

## 📁 Repository Structure
```
├── index.html          # Incident Commander EOC Command Console
├── user.html           # Citizen Smartphone Emergency Portal (Shake ×2, 4 Pillars)
├── server.py           # Multi-threaded Python server with SSE real-time push
├── data-state.json     # Live disaster state persistence (SOS, checkins, relief)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for offline resilience
├── js/
│   ├── app.js          # Core EOC controller, auth gate, and SSE listener
│   ├── map.js          # Leaflet geospatial crisis mapping & radar beacons
│   └── mobile.js       # Citizen interface helper logic
├── css/
│   └── styles.css      # Custom animations, strobe overlay, radar pulses
└── vendor/             # 100% local offline vendor assets (Tailwind, Leaflet, Chart.js)
```

---

## 🏆 Smart India Hackathon 2026 Demonstration Guide
1. Log in to the Admin Console on laptop (`User ID: ResQhub`, `Password: 25082007`).
2. Open `user.html` on a mobile device or test in device mockup mode.
3. Tap **⚡ TAP SOS** or click **📳 Test Shake**.
4. The laptop sounds an immediate siren and pops up the citizen's GPS coordinates, battery level, and exact timestamp.
5. Commander assigns an NDRF unit; citizen's phone updates with two-way confirmation in real time.
