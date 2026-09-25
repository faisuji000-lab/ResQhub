import http.server
import socketserver
import json
import os
import sys
import queue
import threading
import datetime

# Ensure UTF-8 output on Windows console / background logs
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = 8080
BASE_DIR = r"C:\Users\parvi\.gemini\antigravity\scratch\disaster-management-system"
STATE_FILE = os.path.join(BASE_DIR, "data-state.json")
DEFAULT_TUNNEL_URL = "https://subsection-finest-shepherd-bunny.trycloudflare.com"

# Global SSE listeners for instant 0-delay push notifications
EVENT_LISTENERS = []
LISTENERS_LOCK = threading.Lock()

def broadcast_event(event_type, payload):
    try:
        data_str = json.dumps({"type": event_type, "data": payload})
        msg = f"event: {event_type}\ndata: {data_str}\n\n"
        with LISTENERS_LOCK:
            dead = []
            for q in EVENT_LISTENERS:
                try:
                    q.put_nowait(msg)
                except Exception:
                    dead.append(q)
            for d in dead:
                if d in EVENT_LISTENERS:
                    EVENT_LISTENERS.remove(d)
    except Exception as e:
        safe_log(f"Error broadcasting event {event_type}: {e}")

def get_live_tunnel_url():
    try:
        tasks_dir = r"C:\Users\parvi\.gemini\antigravity\brain\07d3b055-5c87-4ffc-9ff6-d53b8006c47c\.system_generated\tasks"
        if os.path.exists(tasks_dir):
            import re
            logs = [os.path.join(tasks_dir, f) for f in os.listdir(tasks_dir) if f.endswith('.log')]
            logs.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            for lp in logs[:5]:
                try:
                    with open(lp, 'r', encoding='utf-8', errors='ignore') as lf:
                        text = lf.read()
                        matches = re.findall(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com', text)
                        if matches:
                            return matches[-1]
                except Exception:
                    pass
    except Exception:
        pass
    return DEFAULT_TUNNEL_URL

def safe_log(msg):
    try:
        clean = str(msg).encode('ascii', errors='replace').decode('ascii')
        sys.stderr.write(f"{clean}\n")
        sys.stderr.flush()
    except Exception:
        pass

class DisasterCrisisHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        try:
            sys.stderr.write(f"[{self.log_date_time_string()}] {args[0]} {args[1]}\n")
            sys.stderr.flush()
        except Exception:
            pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0]

        # Route aliases for the phone-only citizen emergency portal
        if clean_path in ["/user", "/user.html", "/sos", "/sos.html"]:
            self.path = "/user.html"
            return super().do_GET()

        # Mobile device auto-redirection on root path
        if clean_path in ["", "/"]:
            user_agent = self.headers.get("User-Agent", "").lower()
            if any(m in user_agent for m in ["mobile", "android", "iphone", "ipad"]):
                self.path = "/user.html"
            else:
                self.path = "/index.html"
            return super().do_GET()

        if clean_path == "/api/data":
            try:
                if os.path.exists(STATE_FILE):
                    with open(STATE_FILE, "r", encoding="utf-8-sig") as f:
                        state = json.load(f)
                else:
                    state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}
                
                # Sanitize state before serving
                state["sosAlerts"] = [s for s in state.get("sosAlerts", []) if s and isinstance(s, dict) and s.get("id")]
                state["survivorCheckins"] = [c for c in state.get("survivorCheckins", []) if c and isinstance(c, dict) and c.get("id")]
                state["reliefRequests"] = [r for r in state.get("reliefRequests", []) if r and isinstance(r, dict) and r.get("id")]

                content = json.dumps(state).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                safe_log(f"Error serving /api/data: {e}")
                self.send_response(500)
                self.end_headers()
            return

        if clean_path in ["/api/events", "/api/stream"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            client_q = queue.Queue(maxsize=100)
            with LISTENERS_LOCK:
                EVENT_LISTENERS.append(client_q)

            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
            except Exception:
                with LISTENERS_LOCK:
                    if client_q in EVENT_LISTENERS:
                        EVENT_LISTENERS.remove(client_q)
                return

            try:
                while True:
                    try:
                        msg = client_q.get(timeout=10)
                        self.wfile.write(msg.encode("utf-8"))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with LISTENERS_LOCK:
                    if client_q in EVENT_LISTENERS:
                        EVENT_LISTENERS.remove(client_q)
            return

        if clean_path == "/api/info":
            tunnel_url = get_live_tunnel_url()
            info = {
                "port": PORT,
                "status": "Online",
                "tunnel": tunnel_url,
                "url": f"http://localhost:{PORT}"
            }
            content = json.dumps(info).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?")[0]
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if clean_path == "/api/sos":
            if not payload or not isinstance(payload, dict) or not payload.get("id"):
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid SOS payload"}).encode("utf-8"))
                return

            now_dt = datetime.datetime.now()
            exact_time = now_dt.strftime("%I:%M:%S %p (%d %b)")
            if not payload.get("timestamp") or payload.get("timestamp") == "Just now":
                payload["timestamp"] = exact_time
            if not payload.get("timestampIso"):
                payload["timestampIso"] = now_dt.isoformat()

            try:
                if os.path.exists(STATE_FILE):
                    with open(STATE_FILE, "r", encoding="utf-8-sig") as f:
                        state = json.load(f)
                else:
                    state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}
            except Exception:
                state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}

            if not isinstance(payload.get("needs"), list):
                payload["needs"] = ["Immediate Extraction"]
            if not payload.get("status"):
                payload["status"] = "Pending Dispatch"
            if not payload.get("assignedUnit"):
                payload["assignedUnit"] = "Unassigned"
            if not payload.get("priority"):
                payload["priority"] = "CRITICAL"

            alerts = [s for s in state.get("sosAlerts", []) if s and isinstance(s, dict) and s.get("id")]
            # Prepend or update
            existing = next((s for s in alerts if s.get("id") == payload.get("id")), None)
            if existing:
                existing.update(payload)
            else:
                alerts.insert(0, payload)
            state["sosAlerts"] = alerts

            try:
                with open(STATE_FILE, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)
            except Exception as e:
                safe_log(f"Error saving SOS to state file: {e}")

            resp = json.dumps({"success": True, "message": "SOS registered", "id": payload.get("id"), "timestamp": payload.get("timestamp")}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)

            # Instant real-time push to all connected admin consoles
            broadcast_event("NEW_SOS", payload)

            # Log safely without unicode crash
            safe_log(f"\n>>> [INSTANT SOS RECEIVED at {payload.get('timestamp')}] ID: {payload.get('id')} | From: {payload.get('name')} | Trigger: {payload.get('triggerMethod', 'BUTTON')} | Priority: {payload.get('priority')}")
            return

        if clean_path in ["/api/checkin", "/api/volunteer"]:
            if not payload or not isinstance(payload, dict) or not payload.get("id"):
                self.send_response(400)
                self.end_headers()
                return

            now_dt = datetime.datetime.now()
            exact_time = now_dt.strftime("%I:%M:%S %p (%d %b)")
            if not payload.get("timestamp") or payload.get("timestamp") == "Just now":
                payload["timestamp"] = exact_time

            try:
                if os.path.exists(STATE_FILE):
                    with open(STATE_FILE, "r", encoding="utf-8-sig") as f:
                        state = json.load(f)
                else:
                    state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}
            except Exception:
                state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}

            checkins = [c for c in state.get("survivorCheckins", []) if c and isinstance(c, dict) and c.get("id")]
            if not any(c.get("id") == payload.get("id") for c in checkins):
                checkins.insert(0, payload)
            state["survivorCheckins"] = checkins

            try:
                with open(STATE_FILE, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)
            except Exception as e:
                safe_log(f"Error saving checkin: {e}")

            resp = json.dumps({"success": True, "id": payload.get("id")}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)

            # Broadcast check-in to connected consoles
            broadcast_event("CHECKIN", payload)
            safe_log(f"\n>>> [SURVIVOR CHECK-IN] {payload.get('name')} | Status: {payload.get('status')} | Loc: {payload.get('location')}")
            return

        if clean_path == "/api/relief":
            if not payload or not isinstance(payload, dict) or not payload.get("id"):
                self.send_response(400)
                self.end_headers()
                return

            try:
                if os.path.exists(STATE_FILE):
                    with open(STATE_FILE, "r", encoding="utf-8-sig") as f:
                        state = json.load(f)
                else:
                    state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}
            except Exception:
                state = {"sosAlerts": [], "survivorCheckins": [], "reliefRequests": []}

            relief = [r for r in state.get("reliefRequests", []) if r and isinstance(r, dict) and r.get("id")]
            if not any(r.get("id") == payload.get("id") for r in relief):
                relief.insert(0, payload)
            state["reliefRequests"] = relief

            try:
                with open(STATE_FILE, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)
            except Exception as e:
                safe_log(f"Error saving relief: {e}")

            resp = json.dumps({"success": True, "id": payload.get("id")}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)

            broadcast_event("RELIEF", payload)
            safe_log(f"\n>>> [RELIEF REQUEST] From: {payload.get('name')} | Items: {payload.get('items')}")
            return

        if clean_path == "/api/update-sos":
            try:
                if os.path.exists(STATE_FILE):
                    with open(STATE_FILE, "r", encoding="utf-8-sig") as f:
                        state = json.load(f)
                else:
                    state = {"sosAlerts": []}
            except Exception:
                state = {"sosAlerts": []}

            for s in state.get("sosAlerts", []):
                if s and isinstance(s, dict) and s.get("id") == payload.get("id"):
                    if "status" in payload: s["status"] = payload["status"]
                    if "assignedUnit" in payload: s["assignedUnit"] = payload["assignedUnit"]

            try:
                with open(STATE_FILE, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)
            except Exception as e:
                safe_log(f"Error updating SOS: {e}")

            resp = json.dumps({"success": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)

            # Broadcast update back to citizen phone beacon tracker
            broadcast_event("UPDATE_SOS", payload)
            safe_log(f"\n>>> [ADMIN UPDATE SOS] {payload.get('id')} -> Status: {payload.get('status')} | Unit: {payload.get('assignedUnit')}")
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), DisasterCrisisHandler) as httpd:
        safe_log("============================================================")
        safe_log(f"  ResQHub Python Server listening on port {PORT}")
        safe_log(f"  Laptop Command: http://localhost:{PORT}")
        safe_log("============================================================")
        httpd.serve_forever()
