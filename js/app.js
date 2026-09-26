// Main Application State and Controller for ResQHub

const STORAGE_KEY = 'resqhub_disaster_state_v1';
let appState = null;
let resourceChart = null;

// ==========================================
// INCIDENT COMMANDER AUTHENTICATION CONTROLLER
// ==========================================
const ADMIN_CREDENTIALS = {
  username: "ResQhub",
  password: "25082007"
};
const ADMIN_AUTH_KEY = "resqhub_admin_auth_v1";

function isCommanderAuthenticated() {
  const session = sessionStorage.getItem(ADMIN_AUTH_KEY) || localStorage.getItem(ADMIN_AUTH_KEY);
  if (!session) return false;
  try {
    const data = JSON.parse(session);
    return !!(data && data.authenticated && (data.username || '').toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
  } catch(e) {
    return false;
  }
}

function checkAdminAuth() {
  if (isCommanderAuthenticated()) {
    const session = sessionStorage.getItem(ADMIN_AUTH_KEY) || localStorage.getItem(ADMIN_AUTH_KEY);
    let username = ADMIN_CREDENTIALS.username;
    try {
      const data = JSON.parse(session);
      if (data && data.username) username = data.username;
    } catch(e) {}
    showAdminConsole(username);
    return true;
  } else {
    showAuthOverlay();
    return false;
  }
}

function showAuthOverlay() {
  const overlay = document.getElementById('admin-auth-overlay');
  const mainWrapper = document.getElementById('admin-main-wrapper');
  const profileBadge = document.getElementById('admin-user-profile-badge');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }
  if (mainWrapper) {
    mainWrapper.classList.add('hidden');
    mainWrapper.classList.remove('flex');
  }
  if (profileBadge) {
    profileBadge.classList.add('hidden');
    profileBadge.classList.remove('flex');
  }
  setTimeout(() => {
    const userInp = document.getElementById('input-admin-username');
    if (userInp) userInp.focus();
  }, 150);
}

function showAdminConsole(username = 'ResQhub') {
  const overlay = document.getElementById('admin-auth-overlay');
  const mainWrapper = document.getElementById('admin-main-wrapper');
  const profileBadge = document.getElementById('admin-user-profile-badge');
  const usernameDisplay = document.getElementById('admin-logged-username');

  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
  if (mainWrapper) {
    mainWrapper.classList.remove('hidden');
    mainWrapper.classList.add('flex');
  }
  if (profileBadge) {
    profileBadge.classList.remove('hidden');
    profileBadge.classList.add('flex');
  }
  if (usernameDisplay) {
    usernameDisplay.innerText = username;
  }

  // Ensure Leaflet map recalculates its dimensions after container unhiding
  setTimeout(() => {
    if (typeof mapInstance !== 'undefined' && mapInstance) {
      mapInstance.invalidateSize();
    }
  }, 250);
}

function handleAdminLogin(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const usernameInput = document.getElementById('input-admin-username');
  const passwordInput = document.getElementById('input-admin-password');
  const rememberChk = document.getElementById('chk-remember-admin');
  const errorMsg = document.getElementById('auth-error-msg');
  const errorText = document.getElementById('auth-error-text');

  const enteredUser = (usernameInput?.value || '').trim();
  const enteredPass = (passwordInput?.value || '').trim();

  // Case-tolerant comparison for username, exact match for password
  if (enteredUser.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase() && enteredPass === ADMIN_CREDENTIALS.password) {
    if (errorMsg) errorMsg.classList.add('hidden');
    
    const authData = JSON.stringify({
      authenticated: true,
      username: ADMIN_CREDENTIALS.username,
      loginTime: new Date().toISOString()
    });

    if (rememberChk && rememberChk.checked) {
      localStorage.setItem(ADMIN_AUTH_KEY, authData);
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    } else {
      sessionStorage.setItem(ADMIN_AUTH_KEY, authData);
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }

    showAdminConsole(ADMIN_CREDENTIALS.username);
    unlockAudioContext();
    refreshAllViews();
    showToast(`🛡️ Welcome Commander! ResQHub EOC Console Unlocked.`, 'success');
    return false;
  } else {
    if (errorMsg) {
      errorMsg.classList.remove('hidden', 'animate-shake');
      void errorMsg.offsetWidth;
      errorMsg.classList.add('flex', 'animate-shake');
      if (errorText) {
        errorText.innerText = 'ACCESS DENIED: Incorrect User ID or Password.';
      }
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus();
    }
    showToast('❌ Access Denied: Invalid Credentials', 'alert');
    return false;
  }
}

function handleAdminLogout() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  stopAdminSiren();
  showAuthOverlay();
  const passwordInput = document.getElementById('input-admin-password');
  if (passwordInput) passwordInput.value = '';
  showToast('🔒 Commander logged out. EOC Console locked.', 'info');
}

function togglePasswordVisibility() {
  const input = document.getElementById('input-admin-password');
  const icon = document.getElementById('eye-icon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.innerText = '🙈';
  } else {
    input.type = 'password';
    if (icon) icon.innerText = '👁️';
  }
}

// Audio Context & High-Intensity Siren Alert Engine
let audioCtx = null;
let activeSirenGain = null;
let isSirenRinging = false;
let audioContextUnlocked = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx) {
    audioContextUnlocked = true;
    console.log("Audio Context unlocked for emergency sirens");
  }
}
window.addEventListener('click', unlockAudioContext, { once: true });
window.addEventListener('keydown', unlockAudioContext, { once: true });

function playEmergencyBeep(type = 'alarm') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'alarm') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn("Audio error:", e);
  }
}

// Emergency High-Intensity Siren (Alternating Two-Tone Klaxon)
function playAdminSiren(durationSeconds = 7) {
  try {
    stopAdminSiren();
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    const now = ctx.currentTime;
    for (let i = 0; i < durationSeconds * 2.5; i++) {
      const t = now + i * 0.35;
      const freq = (i % 2 === 0) ? 960 : 640;
      osc.frequency.setValueAtTime(freq, t);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + durationSeconds);

    activeSirenGain = gain;
    isSirenRinging = true;

    // Visual tab blink to grab immediate attention
    let blink = false;
    const originalTitle = document.title;
    const blinkInterval = setInterval(() => {
      blink = !blink;
      document.title = blink ? "🚨 INCOMING SOS FROM SMARTPHONE!" : "🔴 RESQHUB MAIN ADMIN";
    }, 400);

    setTimeout(() => {
      clearInterval(blinkInterval);
      document.title = originalTitle;
      isSirenRinging = false;
    }, durationSeconds * 1000);

  } catch (e) {
    console.warn("Could not play siren audio:", e);
  }
}

function stopAdminSiren() {
  if (activeSirenGain) {
    try {
      activeSirenGain.gain.setValueAtTime(0, 0);
    } catch(e) {}
    activeSirenGain = null;
  }
  isSirenRinging = false;
}

function testSirenSound() {
  unlockAudioContext();
  playAdminSiren(3);
  showToast("🔊 Testing Admin Siren Alarm! Audio is fully active & unmuted.", "alert");
}

let currentIncomingSos = null;

function showAdminIncomingSosModal(sosRecord) {
  if (!sosRecord) return;
  currentIncomingSos = sosRecord;
  const modal = document.getElementById('modal-admin-incoming-sos');
  if (!modal) return;

  const idEl = document.getElementById('admin-sos-id');
  const nameEl = document.getElementById('admin-sos-name');
  const phoneEl = document.getElementById('admin-sos-phone');
  const trappedEl = document.getElementById('admin-sos-trapped');
  const needsEl = document.getElementById('admin-sos-needs');
  const coordsEl = document.getElementById('admin-sos-coords');
  const addressEl = document.getElementById('admin-sos-address');

  if (idEl) idEl.innerText = `#${(sosRecord.id || 'SOS').toUpperCase()}`;
  if (nameEl) nameEl.innerText = sosRecord.name || "Mobile Citizen";
  if (phoneEl) phoneEl.innerText = `📞 ${sosRecord.phone || '+91 Emergency'}`;
  if (trappedEl) trappedEl.innerText = `${sosRecord.peopleTrapped || 1} People ${sosRecord.hasInjuries ? '(⚠️ Injuries)' : ''}`;
  const needsArr = Array.isArray(sosRecord.needs) ? sosRecord.needs : (sosRecord.needs ? [sosRecord.needs] : ['Emergency Extraction']);
  if (needsEl) needsEl.innerText = needsArr.join(', ');
  const latNum = Number(sosRecord.lat || 19.076);
  const lngNum = Number(sosRecord.lng || 72.855);
  if (coordsEl) coordsEl.innerText = `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
  if (addressEl) addressEl.innerText = sosRecord.address || `Satellite GPS (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`;

  const timestampEl = document.getElementById('admin-sos-timestamp');
  if (timestampEl) timestampEl.innerText = sosRecord.timestamp || new Date().toLocaleTimeString();

  const shakeBadge = document.getElementById('admin-sos-shake-badge');
  if (shakeBadge) {
    const isShake = sosRecord.triggerMethod === 'SHAKE_X2' || 
                    (Array.isArray(sosRecord.needs) && sosRecord.needs.some(n => String(n).toLowerCase().includes('shake'))) ||
                    (typeof sosRecord.notes === 'string' && sosRecord.notes.toLowerCase().includes('shake'));
    if (isShake) {
      shakeBadge.classList.remove('hidden');
      shakeBadge.classList.add('flex');
    } else {
      shakeBadge.classList.add('hidden');
      shakeBadge.classList.remove('flex');
    }
  }

  const batteryEl = document.getElementById('admin-sos-battery');
  const accEl = document.getElementById('admin-sos-accuracy');
  const gmapsLink = document.getElementById('admin-sos-gmaps-link');
  if (batteryEl) batteryEl.innerText = sosRecord.battery ? `🔋 ${sosRecord.battery}` : '🔋 Active';
  if (accEl) accEl.innerText = sosRecord.accuracyMeters ? `🎯 ±${sosRecord.accuracyMeters}m Fix` : '🎯 ±4m Fix';
  if (gmapsLink) gmapsLink.href = `https://www.google.com/maps?q=${latNum},${lngNum}`;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function openLatestPendingSosModal() {
  if (!appState || !appState.sosAlerts) return;
  const pending = appState.sosAlerts.find(s => s && s.status === 'Pending Dispatch') || appState.sosAlerts[0];
  if (pending) {
    showAdminIncomingSosModal(pending);
  } else {
    showToast("No active pending citizen distress calls.", "info");
  }
}

function updatePendingSosBanner() {
  const banner = document.getElementById('banner-pending-sos-alert');
  const countEl = document.getElementById('banner-pending-count');
  const textEl = document.getElementById('banner-pending-sos-text');
  if (!banner) return;

  const pendingAlerts = (appState && appState.sosAlerts) ? appState.sosAlerts.filter(s => s && s.status === 'Pending Dispatch') : [];
  if (pendingAlerts.length > 0) {
    const latest = pendingAlerts[0];
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    if (countEl) countEl.innerText = `${pendingAlerts.length} PENDING CITIZEN SOS`;
    if (textEl) {
      textEl.innerText = `Latest: ${latest.name} (${latest.address}) • ⏱️ ${latest.timestamp || 'Just now'} • ${latest.peopleTrapped || 1} trapped • Battery: ${latest.battery || 'N/A'}`;
    }
  } else {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }
}

function adminAcknowledgeAndDispatch() {
  stopAdminSiren();
  const modal = document.getElementById('modal-admin-incoming-sos');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  if (!currentIncomingSos) return;
  const unitSelect = document.getElementById('admin-dispatch-unit-select');
  const unit = unitSelect ? unitSelect.value : "NDRF Rapid Boat Squad Alpha";

  currentIncomingSos.assignedUnit = unit;
  currentIncomingSos.status = "Dispatched";

  saveState();
  refreshAllViews();
  updatePendingSosBanner();

  // Transmit to server so phone receives the live update!
  const updatePayload = { id: currentIncomingSos.id, status: "Dispatched", assignedUnit: unit };
  const candidateUrls = [
    `${SERVER_BASE}/api/update-sos`,
    'http://localhost:8080/api/update-sos',
    'http://127.0.0.1:8080/api/update-sos'
  ];
  for (const url of candidateUrls) {
    if (!url || (url.startsWith('/') && window.location.protocol === 'file:')) continue;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    }).catch(e => console.warn(e));
  }

  focusMapOnCoordinate(Number(currentIncomingSos.lat || 19.076), Number(currentIncomingSos.lng || 72.855), 16);
  showToast(`🚀 Dispatched "${unit}" to ${currentIncomingSos.name}! Status updated on phone.`, "success");
  playEmergencyBeep('info');
}

function adminMuteSiren() {
  stopAdminSiren();
  const modal = document.getElementById('modal-admin-incoming-sos');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  showToast("Siren alarm muted.", "info");
}

// Server-Mode Sync Layer (Auto-detects localhost:8080 even if opened via file:///)
const SERVER_BASE = window.location.protocol.startsWith('http') ? '' : 'http://localhost:8080';
const isServerMode = true; // Always attempt sync with local disaster server
const alertedSosIds = new Set(); // Tracks SOS IDs that have already sounded the siren / popup
let serverSyncInterval = null;
let isInitialSyncDone = false;

function updateAdminFeedStatus(isOnline, alertCount = 0) {
  const statusEl = document.getElementById('admin-smartphone-feed-status');
  if (!statusEl) return;
  if (isOnline) {
    statusEl.className = "text-emerald-400 font-bold flex items-center gap-1.5";
    statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Mobile Feed: Connected (Port 8080 Active)';
  } else {
    statusEl.className = "text-amber-400 font-bold flex items-center gap-1.5";
    statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-amber-400"></span> Server Sync: Offline (Start server.ps1)';
  }
}

// Load or seed state
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved state, resetting to initial", e);
      appState = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  } else {
    appState = JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  // Sanitize arrays from storage
  if (appState) {
    if (Array.isArray(appState.sosAlerts)) {
      appState.sosAlerts = appState.sosAlerts.filter(s => s && typeof s === 'object' && s.id);
      // Mark already resolved or dispatched alerts as alerted so they don't ring siren on reload
      appState.sosAlerts.forEach(s => {
        if (s.status !== 'Pending Dispatch') {
          alertedSosIds.add(s.id);
        }
      });
    } else {
      appState.sosAlerts = [];
    }
    if (Array.isArray(appState.survivorCheckins)) {
      appState.survivorCheckins = appState.survivorCheckins.filter(c => c && typeof c === 'object' && c.id);
    }
    if (Array.isArray(appState.reliefRequests)) {
      appState.reliefRequests = appState.reliefRequests.filter(r => r && typeof r === 'object' && r.id);
    }
  }
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

// Background sync with Wi-Fi / local server
async function syncWithServer() {
  const candidateUrls = [
    `${SERVER_BASE}/api/data`,
    'http://localhost:8080/api/data',
    'http://127.0.0.1:8080/api/data'
  ];

  let rawData = null;

  for (const url of candidateUrls) {
    if (!url || (url.startsWith('/') && window.location.protocol === 'file:')) continue;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        rawData = await res.json();
        break;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  if (!rawData) {
    updateAdminFeedStatus(false);
    return;
  }

  updateAdminFeedStatus(true);
  const data = rawData;

  if (data && data.sosAlerts && Array.isArray(data.sosAlerts)) {
    if (!appState.sosAlerts || !Array.isArray(appState.sosAlerts)) {
      appState.sosAlerts = [];
    }
    appState.sosAlerts = appState.sosAlerts.filter(s => s && typeof s === 'object' && s.id);

    const validServerAlerts = data.sosAlerts.filter(s => s && typeof s === 'object' && s.id);
    let incomingAlertToPopup = null;
    let stateChanged = false;

    // Process each server alert
    validServerAlerts.forEach(serverAlert => {
      if (!Array.isArray(serverAlert.needs)) {
        serverAlert.needs = serverAlert.needs ? [serverAlert.needs] : ['Emergency Rescue'];
      }
      const existingIdx = appState.sosAlerts.findIndex(s => s && s.id === serverAlert.id);
      if (existingIdx === -1) {
        appState.sosAlerts.unshift(serverAlert);
        stateChanged = true;
        if (!alertedSosIds.has(serverAlert.id) && serverAlert.status === 'Pending Dispatch') {
          if (!incomingAlertToPopup) incomingAlertToPopup = serverAlert;
        }
      } else {
        const local = appState.sosAlerts[existingIdx];
        if (local.status !== serverAlert.status || local.assignedUnit !== serverAlert.assignedUnit) {
          appState.sosAlerts[existingIdx] = { ...local, ...serverAlert };
          stateChanged = true;
        }
      }
    });

    // Check for any pending SOS alert not yet alerted
    if (!incomingAlertToPopup) {
      const unalertedPending = appState.sosAlerts.find(s => s && s.status === 'Pending Dispatch' && !alertedSosIds.has(s.id));
      if (unalertedPending && isInitialSyncDone) {
        incomingAlertToPopup = unalertedPending;
      }
    }

    if (stateChanged || !isInitialSyncDone) {
      saveState();
      refreshAllViews();
    }

    updatePendingSosBanner();

    // Trigger siren and popup modal for new/unhandled emergency distress
    if (incomingAlertToPopup) {
      if (isCommanderAuthenticated()) {
        alertedSosIds.add(incomingAlertToPopup.id);
        saveState();
        refreshAllViews();
        playAdminSiren(8);
        showAdminIncomingSosModal(incomingAlertToPopup);
        focusMapOnCoordinate(Number(incomingAlertToPopup.lat || 19.076), Number(incomingAlertToPopup.lng || 72.855), 16);
        showToast(`🚨 URGENT: CITIZEN SOS FROM SMARTPHONE: ${incomingAlertToPopup.name} (${incomingAlertToPopup.address})!`, 'alert');
      }
    }

    isInitialSyncDone = true;

    // Sync survivor checkins and relief requests from phone
    if (data.survivorCheckins && Array.isArray(data.survivorCheckins)) {
      appState.survivorCheckins = data.survivorCheckins.filter(c => c && typeof c === 'object' && c.id);
    }
    if (data.reliefRequests && Array.isArray(data.reliefRequests)) {
      appState.reliefRequests = data.reliefRequests.filter(r => r && typeof r === 'object' && r.id);
    }
  }
}

// ==============================================================
// REAL-TIME INSTANT SSE PUSH LAYER (0-DELAY DISPATCH)
// ==============================================================
let sseEventSource = null;

function initSseEventStream() {
  if (typeof EventSource === 'undefined') return;
  const sseBase = SERVER_BASE || '';
  const sseUrl = `${sseBase}/api/events`;

  try {
    if (sseEventSource) {
      try { sseEventSource.close(); } catch(e) {}
    }
    sseEventSource = new EventSource(sseUrl);

    sseEventSource.addEventListener('NEW_SOS', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const alertData = payload.data || payload;
        handleInstantIncomingSos(alertData);
      } catch (err) {
        console.warn("SSE NEW_SOS parse error:", err);
      }
    });

    sseEventSource.addEventListener('UPDATE_SOS', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const update = payload.data || payload;
        if (appState && appState.sosAlerts && update.id) {
          const match = appState.sosAlerts.find(s => s && s.id === update.id);
          if (match) {
            Object.assign(match, update);
            saveState();
            refreshAllViews();
          }
        }
      } catch(err) {}
    });

    sseEventSource.addEventListener('CHECKIN', () => {
      syncWithServer();
    });

    sseEventSource.addEventListener('RELIEF', () => {
      syncWithServer();
    });

    sseEventSource.onopen = () => {
      console.log("⚡ SSE Real-Time Stream Connected to Laptop EOC Server");
    };

    sseEventSource.onerror = () => {
      // EventSource auto-reconnects, and 500ms syncWithServer polling keeps running seamlessly
    };
  } catch(err) {
    console.warn("SSE stream unavailable, falling back to 500ms fast polling:", err);
  }
}

function handleInstantIncomingSos(sosAlert) {
  if (!sosAlert || !sosAlert.id) return;
  if (!appState.sosAlerts || !Array.isArray(appState.sosAlerts)) {
    appState.sosAlerts = [];
  }

  const existingIdx = appState.sosAlerts.findIndex(s => s && s.id === sosAlert.id);
  if (existingIdx === -1) {
    appState.sosAlerts.unshift(sosAlert);
  } else {
    appState.sosAlerts[existingIdx] = { ...appState.sosAlerts[existingIdx], ...sosAlert };
  }

  saveState();
  refreshAllViews();
  updatePendingSosBanner();

  // Instant Siren Alarm & Modal Trigger (0ms delay!)
  if (!alertedSosIds.has(sosAlert.id) && sosAlert.status === 'Pending Dispatch') {
    if (isCommanderAuthenticated()) {
      alertedSosIds.add(sosAlert.id);
      saveState();
      playAdminSiren(8);
      showAdminIncomingSosModal(sosAlert);
      focusMapOnCoordinate(Number(sosAlert.lat || 19.076), Number(sosAlert.lng || 72.855), 16);
      showToast(`🚨 INSTANT SOS FROM CITIZEN: ${sosAlert.name} (${sosAlert.address})! Sent at ${sosAlert.timestamp || 'Just now'}`, 'alert');
    }
  }
}

async function broadcastSosToServer(sosAlert) {
  knownServerSosIds.add(sosAlert.id);
  if (!isServerMode) return;
  try {
    await fetch(`${SERVER_BASE}/api/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sosAlert)
    });
  } catch (e) {
    console.warn("Failed to broadcast SOS to central server", e);
  }
}


function resetToDefaultData() {
  if (confirm("Reset all disaster data, SOS records, and reports to default demonstration scenario?")) {
    localStorage.removeItem(STORAGE_KEY);
    appState = JSON.parse(JSON.stringify(INITIAL_DATA));
    saveState();
    refreshAllViews();
    showToast("Application data reset to default demo scenario", "info");
  }
}

function copyWifiUrl() {
  const text = document.querySelector('.wifi-server-url-text')?.innerText || 'http://10.198.189.64:8080';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast("📋 Copied Wi-Fi URL: " + text, "info");
  } else {
    prompt("Copy this URL to open on your phone:", text);
  }
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'alert' ? 'border-red-500 bg-red-950 text-red-100' :
                   (type === 'info' ? 'border-blue-500 bg-blue-950 text-blue-100' : 'border-emerald-500 bg-emerald-950 text-emerald-100');
  
  toast.className = `flex items-center gap-3 p-3.5 rounded-lg border shadow-xl transition-all transform duration-300 translate-y-2 opacity-0 text-sm font-medium ${borderCol}`;
  toast.innerHTML = `
    <span>${type === 'alert' ? '🚨' : (type === 'info' ? 'ℹ️' : '✅')}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Phase Tab Switcher (Slide 1: INFORM, ALERT, RESPOND, RECOVER)
function switchPhase(phaseKey) {
  // Normalize 4-pillar aliases
  let targetSection = phaseKey;
  if (phaseKey === 'inform') targetSection = 'mitigation';
  if (phaseKey === 'alert' || phaseKey === 'respond') targetSection = 'response';
  if (phaseKey === 'recover') targetSection = 'recovery';

  // Update nav buttons
  document.querySelectorAll('.phase-tab-btn').forEach(btn => {
    if (btn.dataset.phase === phaseKey || btn.dataset.phase === targetSection) {
      btn.className = "phase-tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition bg-blue-600 text-white shadow-lg shadow-blue-900/40 flex items-center gap-2";
    } else {
      btn.className = "phase-tab-btn px-4 py-2 rounded-lg text-sm font-medium transition text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2";
    }
  });

  // Sections
  const sections = ['section-overview', 'section-mitigation', 'section-response', 'section-recovery'];
  sections.forEach(secId => {
    const el = document.getElementById(secId);
    if (!el) return;
    if (targetSection === 'all') {
      el.classList.remove('hidden');
    } else if (secId === `section-${targetSection}`) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // If entering response or all, invalidate map size
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 150);
  }

  // Update resource charts
  renderResourceChart();
}

// Render summary stat counters
function renderStats() {
  const totalShelterCap = appState.shelters.reduce((acc, s) => acc + s.totalCapacity, 0);
  const totalOccupancy = appState.shelters.reduce((acc, s) => acc + s.currentOccupancy, 0);
  const activeSosCount = appState.sosAlerts.filter(s => s.status !== 'Resolved').length;
  const criticalSos = appState.sosAlerts.filter(s => s.priority === 'CRITICAL' && s.status !== 'Resolved').length;
  const totalMissing = appState.missingPersons.filter(m => m.status === 'Missing').length;

  document.getElementById('stat-active-sos').innerText = activeSosCount;
  document.getElementById('stat-critical-sos').innerText = `${criticalSos} Critical`;
  document.getElementById('stat-shelter-occupancy').innerText = `${totalOccupancy} / ${totalShelterCap}`;
  document.getElementById('stat-shelter-percent').innerText = `${Math.round((totalOccupancy / totalShelterCap) * 100)}% Capacity`;
  document.getElementById('stat-missing-count').innerText = totalMissing;
}

// Render SOS Dispatch Table
function renderSosQueue() {
  const tbody = document.getElementById('sos-queue-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const sortedAlerts = [...appState.sosAlerts].sort((a, b) => {
    const priorityScore = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
    return priorityScore[b.priority] - priorityScore[a.priority];
  });

  if (sortedAlerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">No active SOS alerts found. All clear!</td></tr>`;
    return;
  }

  sortedAlerts.forEach(sos => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 hover:bg-slate-800/40 transition";
    
    const badgeColor = sos.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                      (sos.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40');

    const isShakeTrigger = sos.triggerMethod === 'SHAKE_X2' ||
      (Array.isArray(sos.needs) && sos.needs.some(n => String(n).toLowerCase().includes('shake')));

    tr.innerHTML = `
      <td class="py-3 px-3">
        <span class="inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${badgeColor}">
          ${sos.priority}
        </span>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <div class="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
          <span>⏱️</span>
          <span>${sos.timestamp || 'Just now'}</span>
        </div>
      </td>
      <td class="py-3 px-3">
        <div class="font-medium text-slate-200 flex items-center gap-1.5">
          <span>${sos.name}</span>
          ${isShakeTrigger ? '<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700">📳 SHAKE</span>' : ''}
        </div>
        <div class="text-xs text-slate-400 font-mono">${sos.phone}</div>
      </td>
      <td class="py-3 px-3">
        <div class="text-xs font-semibold text-slate-300">${sos.peopleTrapped} people ${sos.hasInjuries ? '<span class="text-red-400 ml-1">⚠️ Injured</span>' : ''}</div>
        <div class="text-[11px] text-slate-400 truncate max-w-[200px]" title="${sos.address}">${sos.address}</div>
      </td>
      <td class="py-3 px-3">
        <div class="flex flex-wrap gap-1">
          ${(Array.isArray(sos.needs) ? sos.needs : (sos.needs ? [sos.needs] : ['Emergency Rescue'])).map(n => `<span class="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700">${n}</span>`).join('')}
        </div>
      </td>
      <td class="py-3 px-3">
        <div class="text-xs font-medium ${sos.assignedUnit && sos.assignedUnit !== 'Unassigned' ? 'text-emerald-400' : 'text-slate-500'}">
          ${sos.assignedUnit || 'Unassigned'}
        </div>
        <div class="text-[11px] text-slate-400">${sos.status}</div>
      </td>
      <td class="py-3 px-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="zoomToSos('${sos.id}')" title="Locate on Map" class="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition">
            📍
          </button>
          ${sos.status !== 'Resolved' ? `
            <button onclick="dispatchRescue('${sos.id}')" title="Assign / Dispatch Unit" class="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition">
              Dispatch
            </button>
            <button onclick="resolveSos('${sos.id}')" title="Mark Evacuated & Resolved" class="text-xs px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition">
              Resolve
            </button>
          ` : `<span class="text-xs text-emerald-400">Resolved</span>`}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function zoomToSos(sosId) {
  const sos = appState.sosAlerts.find(s => s.id === sosId);
  if (sos) {
    focusMapOnCoordinate(sos.lat, sos.lng, 16);
    showToast(`Focused map on SOS location for ${sos.name}`, "info");
  }
}

function dispatchRescue(sosId) {
  const sos = appState.sosAlerts.find(s => s.id === sosId);
  if (!sos) return;

  const unit = prompt(`Assign Emergency Unit to ${sos.name} (${sos.address}):`, sos.assignedUnit !== 'Unassigned' ? sos.assignedUnit : "NDRF Rapid Rescue Unit Beta");
  if (unit) {
    sos.assignedUnit = unit;
    sos.status = "Dispatched";
    saveState();
    refreshAllViews();
    
    const updatePayload = { id: sos.id, status: "Dispatched", assignedUnit: unit };
    const candidateUrls = [
      `${SERVER_BASE}/api/update-sos`,
      'http://localhost:8080/api/update-sos',
      'http://127.0.0.1:8080/api/update-sos'
    ];
    for (const url of candidateUrls) {
      if (!url || (url.startsWith('/') && window.location.protocol === 'file:')) continue;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      }).catch(e => console.warn(e));
    }
    showToast(`Unit "${unit}" successfully dispatched to ${sos.name}`, "success");
    playEmergencyBeep('info');
  }
}

function resolveSos(sosId) {
  const sos = appState.sosAlerts.find(s => s.id === sosId);
  if (!sos) return;

  sos.status = "Resolved";
  saveState();
  refreshAllViews();
  
  const updatePayload = { id: sos.id, status: "Resolved" };
  const candidateUrls = [
    `${SERVER_BASE}/api/update-sos`,
    'http://localhost:8080/api/update-sos',
    'http://127.0.0.1:8080/api/update-sos'
  ];
  for (const url of candidateUrls) {
    if (!url || (url.startsWith('/') && window.location.protocol === 'file:')) continue;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    }).catch(e => console.warn(e));
  }
  showToast(`SOS alert #${sos.id} (${sos.name}) marked as resolved & evacuated.`, "success");
}

// Pre-Disaster Mitigation Checklist
function renderChecklist() {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  container.innerHTML = '';
  const total = appState.mitigationChecklist.length;
  const completed = appState.mitigationChecklist.filter(c => c.completed).length;
  const percent = Math.round((completed / total) * 100);

  document.getElementById('checklist-progress-bar').style.width = `${percent}%`;
  document.getElementById('checklist-progress-text').innerText = `${completed} of ${total} Completed (${percent}%)`;

  appState.mitigationChecklist.forEach(item => {
    const div = document.createElement('div');
    div.className = `flex items-start gap-3 p-3 rounded-lg border transition ${item.completed ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-800/40 border-slate-700/60'}`;
    div.innerHTML = `
      <input type="checkbox" id="${item.id}" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem('${item.id}')" class="mt-1 w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-500 cursor-pointer">
      <div class="flex-1">
        <label for="${item.id}" class="font-medium text-sm cursor-pointer ${item.completed ? 'text-slate-400 line-through' : 'text-slate-200'}">
          ${item.title}
        </label>
        <p class="text-xs text-slate-400 mt-0.5">${item.desc}</p>
        <span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${item.category}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function toggleChecklistItem(id) {
  const item = appState.mitigationChecklist.find(c => c.id === id);
  if (item) {
    item.completed = !item.completed;
    saveState();
    renderChecklist();
  }
}

// Missing Persons Registry
function renderMissingPersons(filterQuery = '', filterStatus = 'all') {
  const grid = document.getElementById('missing-persons-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const list = appState.missingPersons.filter(person => {
    const matchesQuery = filterQuery === '' || 
      person.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      person.lastSeenLocation.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || person.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-sm">No matching records found.</div>`;
    return;
  }

  list.forEach(person => {
    const card = document.createElement('div');
    card.className = "p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md hover:border-slate-700 transition flex flex-col justify-between";
    
    const statusBadge = person.status === 'Missing' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                       (person.status === 'Located in Shelter' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40');

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
            ${person.gender === 'Male' ? '👨' : '👩'}
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusBadge}">${person.status}</span>
        </div>
        <h4 class="font-bold text-slate-100 text-base">${person.name}, <span class="text-sm font-normal text-slate-400">${person.age} yrs</span></h4>
        <div class="text-xs text-slate-400 mt-2 space-y-1">
          <div><strong class="text-slate-300">Last Seen:</strong> ${person.lastSeenLocation} (${person.lastSeenTime})</div>
          <div><strong class="text-slate-300">Clothing / Marks:</strong> ${person.clothing}</div>
          <div class="italic text-slate-400 bg-slate-800/40 p-1.5 rounded mt-1 text-[11px]">"${person.notes}"</div>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-800 mt-3 flex items-center justify-between text-xs">
        <span class="text-slate-400">📞 ${person.contactPerson}</span>
        ${person.status === 'Missing' ? `
          <button onclick="markPersonLocated('${person.id}')" class="text-[11px] px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded font-medium transition">
            Mark Located
          </button>
        ` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

function markPersonLocated(id) {
  const p = appState.missingPersons.find(m => m.id === id);
  if (p) {
    const shelter = prompt("Enter shelter name or location where person was safely found:", "St. Jude High School Relief Camp");
    if (shelter) {
      p.status = "Located in Shelter";
      p.notes += ` [Located at ${shelter}]`;
      saveState();
      refreshAllViews();
      showToast(`${p.name} updated as Located in Shelter!`, "success");
    }
  }
}

// Chart.js: Resource Allocation Visualization
function renderResourceChart() {
  const ctx = document.getElementById('resourceAllocationChart');
  if (!ctx || ctx.offsetParent === null) return;

  const totalIcu = appState.hospitals.reduce((acc, h) => acc + h.totalIcuBeds, 0);
  const availIcu = appState.hospitals.reduce((acc, h) => acc + h.availableIcuBeds, 0);
  const ambulances = appState.hospitals.reduce((acc, h) => acc + h.emergencyAmbulances, 0);
  const waterLitersThousand = Math.round(appState.shelters.reduce((acc, s) => acc + s.supplies.cleanWaterLiters, 0) / 1000);
  const foodDaysTotal = appState.shelters.reduce((acc, s) => acc + s.supplies.foodDays, 0);

  const data = {
    labels: ['Available ICU Beds', 'Deployed Ambulances', 'Water Rations (k-Liters)', 'Food Stock (Days)', 'Active Volunteers'],
    datasets: [{
      label: 'Units Available in Fleet / Hubs',
      data: [availIcu, ambulances, waterLitersThousand, foodDaysTotal, appState.volunteers.length],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(6, 182, 212, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(168, 85, 247, 0.7)'
      ],
      borderColor: [
        '#3b82f6',
        '#f97316',
        '#06b6d4',
        '#10b981',
        '#a855f7'
      ],
      borderWidth: 1
    }]
  };

  if (resourceChart) {
    resourceChart.destroy();
  }

  resourceChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        }
      }
    }
  });
}

// ==========================================
// 6-PILLAR POST-DISASTER RECOVERY CONTROLLERS
// ==========================================

// Subtab switcher for Post-Disaster Section
function switchPostDisasterSubtab(subtabKey) {
  document.querySelectorAll('.post-subtab-btn').forEach(btn => {
    if (btn.dataset.subtab === subtabKey) {
      btn.className = "post-subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-blue-600 text-white shadow active";
    } else {
      btn.className = "post-subtab-btn px-3 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white hover:bg-slate-800";
    }
  });

  const subPanels = [
    'post-tab-safe',
    'post-tab-missing',
    'post-tab-donations',
    'post-tab-volunteers',
    'post-tab-claims',
    'post-tab-mental'
  ];

  subPanels.forEach(panelId => {
    const el = document.getElementById(panelId);
    if (!el) return;
    if (subtabKey === 'all') {
      el.classList.remove('hidden');
    } else if (panelId === `post-tab-${subtabKey}`) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// 1. 'I Am Safe' Tracker
function renderSafeCheckins(searchQuery = '') {
  const container = document.getElementById('safe-checkins-grid');
  if (!container) return;

  container.innerHTML = '';
  const query = searchQuery.toLowerCase().trim();
  const list = (appState.safeCheckins || []).filter(item => {
    return query === '' || 
      item.name.toLowerCase().includes(query) || 
      item.phone.includes(query) || 
      item.currentLocation.toLowerCase().includes(query);
  });

  const countBadge = document.getElementById('safe-count-badge');
  if (countBadge) {
    countBadge.innerText = `${appState.safeCheckins ? appState.safeCheckins.length : 0} Verified Safe`;
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-full py-6 text-center text-slate-500 text-xs">No matching safety check-ins found.</div>`;
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = "p-3.5 rounded-xl bg-slate-900/90 border border-emerald-900/40 shadow hover:border-emerald-700/60 transition flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center justify-center text-sm font-bold">✓</span>
            <div>
              <h4 class="font-bold text-slate-100 text-sm">${item.name}</h4>
              <div class="text-[11px] text-slate-400">${item.phone}</div>
            </div>
          </div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            ${item.status}
          </span>
        </div>

        <div class="text-xs space-y-1 mt-2">
          <div class="text-slate-300"><strong class="text-emerald-400">Shelter:</strong> ${item.currentLocation}</div>
          <div class="text-[11px] bg-slate-800/60 p-2 rounded border border-slate-800 text-slate-300 italic mt-1">
            "${item.message}"
          </div>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-800 mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>⏱️ ${item.timestamp}</span>
        <span class="text-slate-300">Family: <strong>${item.familyContact || 'N/A'}</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

// 3. Donation & Fundraising Gateway
function renderFundraising() {
  const fund = appState.fundraising;
  if (!fund) return;

  const percent = Math.min(100, Math.round((fund.raisedAmount / fund.targetAmount) * 100));

  const raisedEl = document.getElementById('fund-raised-amount');
  const targetEl = document.getElementById('fund-target-amount');
  const barEl = document.getElementById('fund-progress-bar');
  const percentEl = document.getElementById('fund-percent-badge');
  const donorsEl = document.getElementById('fund-donor-count');

  if (raisedEl) raisedEl.innerText = `₹${(fund.raisedAmount / 10000000).toFixed(2)} Cr`;
  if (targetEl) targetEl.innerText = `Goal: ₹${(fund.targetAmount / 10000000).toFixed(2)} Cr`;
  if (barEl) barEl.style.width = `${percent}%`;
  if (percentEl) percentEl.innerText = `${percent}% Funded`;
  if (donorsEl) donorsEl.innerText = `${fund.donorCount.toLocaleString()} Donors Contributed`;

  // Render recent donations
  const recentList = document.getElementById('recent-donations-list');
  if (recentList && fund.recentDonations) {
    recentList.innerHTML = '';
    fund.recentDonations.slice(0, 4).forEach(d => {
      const row = document.createElement('div');
      row.className = "flex items-center justify-between p-2 rounded bg-slate-800/40 border border-slate-800 text-xs";
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-emerald-400 font-bold">₹</span>
          <span class="text-slate-200 font-medium">${d.donor}</span>
        </div>
        <div class="text-right">
          <span class="font-bold text-emerald-400 font-mono">+₹${d.amount.toLocaleString()}</span>
          <span class="text-[10px] text-slate-500 block">${d.time}</span>
        </div>
      `;
      recentList.appendChild(row);
    });
  }

  // Render in-kind goods
  const inkindGrid = document.getElementById('inkind-goods-grid');
  if (inkindGrid && fund.inKindDonations) {
    inkindGrid.innerHTML = '';
    fund.inKindDonations.forEach(g => {
      const box = document.createElement('div');
      box.className = "p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3";
      box.innerHTML = `
        <span class="text-2xl">${g.icon}</span>
        <div>
          <div class="text-xs text-slate-400 font-medium">${g.item}</div>
          <div class="text-sm font-bold text-white font-mono mt-0.5">${g.count.toLocaleString()} <span class="text-xs font-normal text-slate-400">${g.unit}</span></div>
        </div>
      `;
      inkindGrid.appendChild(box);
    });
  }
}

// 5. Damage Assessment & Government Relief Claims
function renderDamageClaims() {
  const container = document.getElementById('damage-claims-grid');
  if (!container || !appState.damageClaims) return;

  container.innerHTML = '';
  appState.damageClaims.forEach(claim => {
    const card = document.createElement('div');
    card.className = "p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow hover:border-slate-700 transition flex flex-col justify-between";
    
    const statusClass = claim.status === 'Claim Approved' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                       (claim.status === 'Disbursed' ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-amber-950 text-amber-300 border-amber-800');

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <span class="font-mono font-bold text-blue-400 text-xs">${claim.id}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusClass}">
            ${claim.status}
          </span>
        </div>

        <h4 class="font-bold text-slate-200 text-sm">${claim.applicantName}</h4>
        <div class="text-xs text-slate-400 mt-1 space-y-1">
          <div><strong class="text-slate-300">Property:</strong> ${claim.propertyType}</div>
          <div><strong class="text-slate-300">Damage:</strong> <span class="text-amber-400 font-medium">${claim.damageCategory}</span></div>
          <div><strong class="text-slate-300">Location:</strong> ${claim.address}</div>
          <div class="bg-slate-800/50 p-2 rounded text-[11px] text-slate-300 italic mt-1.5 border border-slate-800">
            "${claim.inspectorNotes}"
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 mt-3 flex items-center justify-between text-xs">
        <div>
          <div class="text-[10px] text-slate-500">Estimated Loss</div>
          <div class="font-mono font-bold text-red-400">${claim.estimatedLoss}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-slate-500">Relief Sanctioned</div>
          <div class="font-mono font-bold text-emerald-400">${claim.reliefClaimed}</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 6. Mental Health & Trauma Support
function renderMentalHealth() {
  const mh = appState.mentalHealthResources;
  if (!mh) return;

  // Render Helplines
  const hlContainer = document.getElementById('mental-helplines-grid');
  if (hlContainer && mh.helplines) {
    hlContainer.innerHTML = '';
    mh.helplines.forEach(hl => {
      const card = document.createElement('div');
      card.className = "p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/50 shadow flex items-center justify-between gap-3";
      card.innerHTML = `
        <div>
          <div class="font-bold text-purple-200 text-xs">${hl.name}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${hl.desc} &bull; <span class="text-emerald-400">${hl.hours}</span></div>
        </div>
        <a href="tel:${hl.number}" class="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-mono font-bold text-xs shadow flex items-center gap-1.5 transition shrink-0">
          <span>📞</span> Call
        </a>
      `;
      hlContainer.appendChild(card);
    });
  }

  // Render Counselors
  const cnsContainer = document.getElementById('counselors-list');
  if (cnsContainer && mh.counselors) {
    cnsContainer.innerHTML = '';
    mh.counselors.forEach(c => {
      const row = document.createElement('div');
      row.className = "p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2 text-xs";
      row.innerHTML = `
        <div>
          <div class="font-bold text-slate-200 text-sm">${c.name}</div>
          <div class="text-purple-300 font-medium">${c.specialty}</div>
          <div class="text-slate-400 text-[11px]">${c.hospital}</div>
        </div>
        <button onclick="openBookingForCounselor('${c.name}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-700/60 font-semibold text-[11px] transition">
          Book Session
        </button>
      `;
      cnsContainer.appendChild(row);
    });
  }

  // Render Coping Tips
  const tipsContainer = document.getElementById('coping-tips-list');
  if (tipsContainer && mh.copingTips) {
    tipsContainer.innerHTML = '';
    mh.copingTips.forEach(tip => {
      const div = document.createElement('div');
      div.className = "p-3 rounded-lg bg-slate-800/30 border border-slate-800 text-xs";
      div.innerHTML = `
        <div class="font-bold text-slate-200">${tip.title}</div>
        <div class="text-slate-400 mt-0.5 text-[11px]">${tip.desc}</div>
      `;
      tipsContainer.appendChild(div);
    });
  }
}

function openBookingForCounselor(name) {
  openModal('modal-mental-health');
  const select = document.getElementById('counselor-select');
  if (select && name) {
    let matched = false;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(select.options[i].value.toLowerCase())) {
        select.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      select.value = name;
    }
  }
}

// Switch between Financial and Goods donation forms in modal
function switchDonationType(type) {
  const formMoney = document.getElementById('form-donate-money');
  const formGoods = document.getElementById('form-donate-goods');
  const btnMoney = document.getElementById('tab-btn-money');
  const btnGoods = document.getElementById('tab-btn-goods');

  if (type === 'money') {
    if (formMoney) formMoney.classList.remove('hidden');
    if (formGoods) formGoods.classList.add('hidden');
    if (btnMoney) {
      btnMoney.className = "px-4 py-2 text-xs font-bold border-b-2 border-teal-500 text-teal-400 transition";
    }
    if (btnGoods) {
      btnGoods.className = "px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition";
    }
  } else {
    if (formMoney) formMoney.classList.add('hidden');
    if (formGoods) formGoods.classList.remove('hidden');
    if (btnMoney) {
      btnMoney.className = "px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition";
    }
    if (btnGoods) {
      btnGoods.className = "px-4 py-2 text-xs font-bold border-b-2 border-teal-500 text-teal-400 transition";
    }
  }
}

// Damage Assessments and Volunteers (Legacy & Enhanced)
function renderDamageAndVolunteers() {
  const volContainer = document.getElementById('volunteers-list');
  if (volContainer && appState.volunteers) {
    volContainer.innerHTML = '';
    appState.volunteers.forEach(v => {
      const row = document.createElement('div');
      row.className = "p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs";
      row.innerHTML = `
        <div>
          <div class="font-bold text-slate-200 text-sm">${v.name}</div>
          <div class="text-emerald-400 font-medium">${v.skill}</div>
          <div class="text-slate-400">Assigned: ${v.assignedZone}</div>
        </div>
        <div class="text-right">
          <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">${v.status}</span>
          <div class="text-[11px] text-slate-400 mt-1">${v.phone}</div>
        </div>
      `;
      volContainer.appendChild(row);
    });
  }
}

// Refresh all UI components
function refreshAllViews() {
  renderStats();
  renderSosQueue();
  renderChecklist();
  renderMissingPersons();
  renderSafeCheckins();
  renderFundraising();
  renderDamageClaims();
  renderMentalHealth();
  renderDamageAndVolunteers();
  renderResourceChart();
  updatePendingSosBanner();
  if (typeof refreshMapMarkers === 'function') {
    refreshMapMarkers(appState);
  }
}


// Direct 1-Click Panic SOS without filling any fields
function sendDirectSos() {
  let lat = 19.0760;
  let lng = 72.8550;
  let addressName = "Live Coordinates Pin";

  if (typeof userRealCoords !== 'undefined' && userRealCoords && userRealCoords.lat) {
    lat = userRealCoords.lat;
    lng = userRealCoords.lng;
    addressName = `Real-World GPS [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
  } else if (typeof mapInstance !== 'undefined' && mapInstance) {
    const center = mapInstance.getCenter();
    lat = center.lat;
    lng = center.lng;
    addressName = `Emergency Map Center [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
  }

  const randomId = Math.floor(1000 + Math.random() * 9000);
  const directAlert = {
    id: `sos-${randomId}`,
    timestamp: "Just now",
    name: `Direct Citizen Beacon #${randomId}`,
    phone: "Emergency Channel 112",
    priority: "CRITICAL",
    peopleTrapped: 1,
    hasInjuries: true,
    lat: parseFloat(lat.toFixed(4)),
    lng: parseFloat(lng.toFixed(4)),
    address: addressName,
    needs: ["Immediate Evacuation", "Medical Trauma", "Rescue Squad"],
    status: "Pending Dispatch",
    assignedUnit: "Unassigned",
    notes: "⚡ 1-CLICK INSTANT SOS BROADCAST: Transmitted directly without manual form. Urgent dispatch needed."
  };

  appState.sosAlerts.unshift(directAlert);
  saveState();
  broadcastSosToServer(directAlert);
  refreshAllViews();
  focusMapOnCoordinate(lat, lng, 15);
  playEmergencyBeep('alarm');
  showToast(`🚨 DIRECT SOS TRANSMITTED! Priority: CRITICAL. Zero manual typing required.`, "alert");
}

// Send 1-Click Preset Scenario SOS
function sendPresetSos(presetKey) {
  let lat = 19.0760;
  let lng = 72.8550;
  if (typeof userRealCoords !== 'undefined' && userRealCoords && userRealCoords.lat) {
    lat = userRealCoords.lat;
    lng = userRealCoords.lng;
  } else if (typeof mapInstance !== 'undefined' && mapInstance) {
    const center = mapInstance.getCenter();
    lat = center.lat;
    lng = center.lng;
  }

  const presets = {
    flood: {
      title: "Flash Flood / Boat Rescue",
      needs: ["Inflatable Boat", "Life Jackets", "High Ground Evacuation"],
      notes: "Water surging past danger mark. Trapped on rooftop."
    },
    medical: {
      title: "Critical Medical Trauma",
      needs: ["Emergency Ambulance", "Oxygen Supply", "Trauma First Aid"],
      notes: "Severe medical emergency. Patient requires immediate ICU transit."
    },
    collapse: {
      title: "Structural Debris / Trapped",
      needs: ["Heavy Rescue Squad", "Cutter Tools", "Search Dogs"],
      notes: "Building structure compromised, exit route blocked by debris."
    },
    fire: {
      title: "Active Fire Hazard",
      needs: ["Fire Tender", "Smoke Extraction", "Burn Medical"],
      notes: "Active fire outbreak. Immediate firefighting and evacuation needed."
    }
  };

  const p = presets[presetKey] || presets.flood;
  const randomId = Math.floor(1000 + Math.random() * 9000);

  const presetAlert = {
    id: `sos-${randomId}`,
    timestamp: "Just now",
    name: `Direct Alert #${randomId}`,
    phone: "Emergency Channel 112",
    priority: "CRITICAL",
    peopleTrapped: 2,
    hasInjuries: true,
    lat: parseFloat(lat.toFixed(4)),
    lng: parseFloat(lng.toFixed(4)),
    address: `Zone Pinned [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
    needs: p.needs,
    status: "Pending Dispatch",
    assignedUnit: "Unassigned",
    notes: `⚡ 1-CLICK PRESET [${p.title}]: ${p.notes}`
  };

  appState.sosAlerts.unshift(presetAlert);
  saveState();
  broadcastSosToServer(presetAlert);
  refreshAllViews();
  closeModal('modal-sos');
  focusMapOnCoordinate(lat, lng, 15);
  playEmergencyBeep('alarm');
  showToast(`🚨 1-Click SOS Sent: "${p.title}"! Dispatched to emergency queue.`, "alert");
}

// Auto-fill form fields with 1 click
function quickFillSosForm() {
  document.getElementById('sos-caller-name').value = "Pooja Verma";
  document.getElementById('sos-caller-phone').value = "+91 98200 44321";
  document.getElementById('sos-priority').value = "CRITICAL";
  document.getElementById('sos-trapped-count').value = "3";
  document.getElementById('sos-address').value = "Flat 302, Sea Breeze Apts, Sector 3";
  document.getElementById('sos-has-injuries').checked = true;
  document.getElementById('sos-notes').value = "Water rising rapidly to first floor. Immediate boat evacuation requested.";

  const cbs = document.querySelectorAll('input[name="sos-needs"]');
  if (cbs.length >= 2) {
    cbs[0].checked = true;
    cbs[1].checked = true;
  }

  showToast("⚡ Form auto-populated with emergency details!", "info");
}

// Simulation: Broadcast Siren & Disaster Drill
function simulateDrillAlert() {
  playEmergencyBeep('alarm');

  const simulatedSos = {
    id: `sos-${Date.now().toString().slice(-4)}`,
    timestamp: "Just now",
    name: "Drill Alert: Coastal Ward 9",
    phone: "+91 99999 00112",
    priority: "CRITICAL",
    peopleTrapped: Math.floor(Math.random() * 6) + 3,
    hasInjuries: true,
    lat: 19.0520 + (Math.random() * 0.04 - 0.02),
    lng: 72.8350 + (Math.random() * 0.04 - 0.02),
    address: "Sea-Face Low Ground Apartments, Block C",
    needs: ["Inflatable Boat", "Life Jackets", "First Aid"],
    status: "Pending Dispatch",
    assignedUnit: "Unassigned",
    notes: "SIMULATED EXERCISE: Water breach through seawall. Rapid evacuation needed."
  };

  appState.sosAlerts.unshift(simulatedSos);
  saveState();
  refreshAllViews();
  focusMapOnCoordinate(simulatedSos.lat, simulatedSos.lng, 15);

  showToast(`⚡ SIMULATION TRIGGERED: New Critical SOS broadcast at ${simulatedSos.address}`, "alert");
}

// Handle Form Submissions
function setupForms() {
  // SOS Form
  const sosForm = document.getElementById('emergency-sos-form');
  if (sosForm) {
    sosForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.getElementById('sos-caller-name').value.trim();
      const phone = document.getElementById('sos-caller-phone').value.trim();
      const priority = document.getElementById('sos-priority').value;
      const peopleTrapped = parseInt(document.getElementById('sos-trapped-count').value, 10) || 1;
      const hasInjuries = document.getElementById('sos-has-injuries').checked;
      const address = document.getElementById('sos-address').value.trim();
      const lat = parseFloat(document.getElementById('sos-lat').value) || 19.0760;
      const lng = parseFloat(document.getElementById('sos-lng').value) || 72.8550;
      const notes = document.getElementById('sos-notes').value.trim();

      const needsCheckboxes = document.querySelectorAll('input[name="sos-needs"]:checked');
      const needs = Array.from(needsCheckboxes).map(cb => cb.value);
      if (needs.length === 0) needs.push("General Assistance");

      const newAlert = {
        id: `sos-${Date.now().toString().slice(-4)}`,
        timestamp: "Just now",
        name: name || "Anonymous Citizen",
        phone: phone || "N/A",
        priority,
        peopleTrapped,
        hasInjuries,
        lat,
        lng,
        address: address || "Pinned Location",
        needs,
        status: "Pending Dispatch",
        assignedUnit: "Unassigned",
        notes: notes || "Assistance requested via ResQHub portal."
      };

      appState.sosAlerts.unshift(newAlert);
      saveState();
      broadcastSosToServer(newAlert);
      refreshAllViews();
      focusMapOnCoordinate(lat, lng, 15);

      // Close modal
      closeModal('modal-sos');
      sosForm.reset();

      playEmergencyBeep('alarm');
      showToast(`🚨 Emergency SOS logged! Priority: ${priority}. First responders notified.`, "alert");
    });
  }

  // Missing Person Form
  const mpForm = document.getElementById('report-missing-form');
  if (mpForm) {
    mpForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const newPerson = {
        id: `mp-${Date.now().toString().slice(-4)}`,
        name: document.getElementById('mp-name').value.trim(),
        age: parseInt(document.getElementById('mp-age').value, 10) || 0,
        gender: document.getElementById('mp-gender').value,
        lastSeenLocation: document.getElementById('mp-location').value.trim(),
        lastSeenTime: document.getElementById('mp-time').value.trim() || "Recent",
        contactPerson: document.getElementById('mp-contact').value.trim(),
        status: "Missing",
        clothing: document.getElementById('mp-clothing').value.trim() || "Not specified",
        notes: document.getElementById('mp-notes').value.trim() || "Reported by family"
      };

      appState.missingPersons.unshift(newPerson);
      saveState();
      refreshAllViews();
      closeModal('modal-missing');
      mpForm.reset();
      showToast(`Missing person report filed for ${newPerson.name}. Added to central registry.`, "info");
    });
  }

  // Volunteer Form
  const volForm = document.getElementById('volunteer-form');
  if (volForm) {
    volForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const newVol = {
        id: `vol-${Date.now().toString().slice(-4)}`,
        name: document.getElementById('vol-name').value.trim(),
        skill: document.getElementById('vol-skill').value,
        phone: document.getElementById('vol-phone').value.trim(),
        assignedZone: document.getElementById('vol-zone').value || "Metro Relief Camp",
        status: "Active"
      };

      if (!appState.volunteers) appState.volunteers = [];
      appState.volunteers.push(newVol);
      saveState();
      refreshAllViews();
      closeModal('modal-volunteer');
      volForm.reset();
      showToast(`Thank you ${newVol.name}! Registered to relief operations team.`, "success");
    });
  }

  // 1. 'I Am Safe' Check-in Form
  const safeForm = document.getElementById('form-safe-checkin');
  if (safeForm) {
    safeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('safe-name').value.trim();
      const phone = document.getElementById('safe-phone').value.trim();
      const location = document.getElementById('safe-location').value.trim();
      const message = document.getElementById('safe-message').value.trim();
      const family = document.getElementById('safe-family-contact').value.trim();

      const checkin = {
        id: `safe-${Date.now().toString().slice(-4)}`,
        name,
        phone,
        currentLocation: location,
        timestamp: "Just now",
        status: "Safe & Sheltered",
        message: message || "I am safe and at a relief center.",
        familyContact: family || "Direct phone above"
      };

      if (!appState.safeCheckins) appState.safeCheckins = [];
      appState.safeCheckins.unshift(checkin);
      saveState();
      refreshAllViews();
      closeModal('modal-safe-checkin');
      safeForm.reset();
      playEmergencyBeep('info');
      showToast(`✅ Safety status logged for ${name}! Family can now locate you.`, "success");
    });
  }

  // 3. Donation Forms
  const donateMoneyForm = document.getElementById('form-donate-money');
  if (donateMoneyForm) {
    donateMoneyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const donor = document.getElementById('donate-name').value.trim() || "Anonymous Hero";
      const amount = parseInt(document.getElementById('donate-amount').value, 10) || 1000;

      if (!appState.fundraising) appState.fundraising = { targetAmount: 30000000, raisedAmount: 0, donorCount: 0, recentDonations: [] };
      appState.fundraising.raisedAmount += amount;
      appState.fundraising.donorCount += 1;
      appState.fundraising.recentDonations.unshift({
        donor,
        amount,
        time: "Just now",
        type: "Financial"
      });

      saveState();
      refreshAllViews();
      closeModal('modal-donate');
      donateMoneyForm.reset();
      showToast(`🙏 Thank you, ${donor}! Donation of ₹${amount.toLocaleString()} received for disaster relief.`, "success");
    });
  }

  const donateGoodsForm = document.getElementById('form-donate-goods');
  if (donateGoodsForm) {
    donateGoodsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const item = document.getElementById('goods-item-type').value;
      const count = parseInt(document.getElementById('goods-count').value, 10) || 10;
      const camp = document.getElementById('goods-camp').value;

      showToast(`📦 In-kind pledge confirmed: ${count} units of ${item} pledged for ${camp}. Drop-off pass generated.`, "success");
      closeModal('modal-donate');
      donateGoodsForm.reset();
    });
  }

  // 5. Damage Claims Form
  const claimForm = document.getElementById('form-damage-claim');
  if (claimForm) {
    claimForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const applicantName = document.getElementById('claim-name').value.trim();
      const phone = document.getElementById('claim-phone').value.trim();
      const propertyType = document.getElementById('claim-property-type').value;
      const damageCategory = document.getElementById('claim-damage-category').value.trim();
      const address = document.getElementById('claim-address').value.trim();
      const loss = document.getElementById('claim-estimated-loss').value.trim();
      const relief = document.getElementById('claim-amount-requested').value.trim();
      const notes = document.getElementById('claim-notes').value.trim();

      const newClaim = {
        id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
        applicantName,
        phone,
        propertyType,
        damageCategory,
        estimatedLoss: loss.startsWith('₹') ? loss : `₹${loss}`,
        reliefClaimed: relief.startsWith('₹') ? relief : `₹${relief} (Requested)`,
        status: "Under Inspection",
        address,
        dateFiled: "Just now",
        inspectorNotes: notes || "Application submitted. Surveyor assignment in progress."
      };

      if (!appState.damageClaims) appState.damageClaims = [];
      appState.damageClaims.unshift(newClaim);
      saveState();
      refreshAllViews();
      closeModal('modal-claim');
      claimForm.reset();
      showToast(`📋 Claim ${newClaim.id} filed successfully! Status: Under Inspection.`, "info");
    });
  }

  // 6. Mental Health Counseling Form
  const mhForm = document.getElementById('form-book-counseling');
  if (mhForm) {
    mhForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('counseling-name').value.trim();
      const phone = document.getElementById('counseling-phone').value.trim();
      const counselor = document.getElementById('counselor-select').value;
      const slot = document.getElementById('counseling-slot').value;

      closeModal('modal-mental-health');
      mhForm.reset();
      showToast(`💜 Appointment booked with ${counselor} for ${slot}. Counselor will call ${phone}.`, "success");
    });
  }

  // Safe Search input
  const safeSearch = document.getElementById('safe-search-input');
  if (safeSearch) {
    safeSearch.addEventListener('input', () => {
      renderSafeCheckins(safeSearch.value);
    });
  }
}

// Modal helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Real-World Reality Integration Handlers

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// Real-world GPS detection and nearest emergency shelter locator
function handleDetectUserLocation() {
  showToast("📡 Requesting real-world GPS coordinates...", "info");
  
  locateUserInRealWorld(
    (lat, lng, accuracy) => {
      // Auto-populate SOS form with user's real location
      const latInput = document.getElementById('sos-lat');
      const lngInput = document.getElementById('sos-lng');
      if (latInput && lngInput) {
        latInput.value = lat.toFixed(4);
        lngInput.value = lng.toFixed(4);
      }

      // Calculate distances to all shelters
      const shelterDistances = appState.shelters.map(s => ({
        ...s,
        distance: calculateDistanceKm(lat, lng, s.lat, s.lng)
      })).sort((a, b) => a.distance - b.distance);

      const nearest = shelterDistances[0];

      // Update or create Real-World Evacuation Advisory Banner
      const advisoryEl = document.getElementById('user-location-advisory');
      if (advisoryEl) {
        advisoryEl.classList.remove('hidden');
        advisoryEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
              <div>
                <span class="font-bold text-blue-300">REAL-WORLD GPS LOCKED:</span>
                <span class="text-slate-200 ml-1 font-mono">[${lat.toFixed(4)}, ${lng.toFixed(4)}] &plusmn;${Math.round(accuracy)}m</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-slate-300">
                Nearest Evacuation Hub: <strong class="text-emerald-400">${nearest.name}</strong> 
                (<span class="font-mono font-bold text-amber-300">${nearest.distance} km</span> away)
              </div>
              <button onclick="focusLocation(${nearest.lat}, ${nearest.lng})" class="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px] transition">
                View Shelter &rarr;
              </button>
            </div>
          </div>
        `;
      }

      showToast(`📍 Location acquired! Nearest shelter is ${nearest.distance} km away.`, "success");
      playEmergencyBeep('info');
    },
    (errMsg) => {
      showToast(`⚠️ GPS Error: ${errMsg}`, "alert");
    }
  );
}

// Toggle Live Weather Radar
async function handleToggleRadar() {
  try {
    const result = await toggleLiveRadarOverlay();
    if (result.active) {
      if (result.mode === 'offline') {
        showToast("🌧️ Offline Storm Surge & Precipitation Simulation activated!", "info");
      } else {
        showToast("🌧️ Live RainViewer precipitation radar layer activated!", "success");
      }
    } else {
      showToast("Rain radar overlay deactivated", "info");
    }
  } catch (err) {
    showToast("Rain radar overlay toggled off", "info");
  }
}

// Toggle Live USGS Earthquakes
async function handleToggleEarthquakes() {
  try {
    const result = await toggleLiveEarthquakes();
    if (result.active) {
      if (result.mode === 'offline') {
        showToast(`🔴 Loaded ${result.count} Regional Seismic Fault Telemetry points (Disaster Offline Mode)!`, "alert");
      } else {
        showToast(`🔴 USGS API: Loaded ${result.count} active real-world earthquakes (M2.5+) in the last 24h!`, "alert");
      }
      playEmergencyBeep('info');
    } else {
      showToast("Real-world earthquake layer hidden", "info");
    }
  } catch (err) {
    showToast("Earthquake layer toggled off", "info");
  }
}

function handleSwitchBaseLayer(layerKey) {
  switchMapBaseLayer(layerKey);
  showToast(`Switched map base to ${layerKey.toUpperCase()} mode`, "info");
}

// Offline QR Code Generation (Local Canvas/SVG - Zero Internet)
function renderOfflineQrCode(url) {
  const container = document.getElementById('wifi-qr-container');
  if (!container) return;
  container.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text: url,
      width: 140,
      height: 140,
      colorDark: "#0b1120",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    container.innerHTML = `<div class="p-4 text-center font-mono font-bold text-slate-800 text-xs">${url}</div>`;
  }
}

// Disaster Network Status & Offline Mode Manager
let isForcedOffline = false;

function updateNetworkStatusUI() {
  const badge = document.getElementById('network-status-badge');
  const text = document.getElementById('network-status-text');
  const isOnline = navigator.onLine && !isForcedOffline;

  if (badge && text) {
    if (isOnline) {
      badge.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
      text.innerHTML = `<strong class="text-emerald-300">ONLINE</strong> <span class="text-slate-400 hidden sm:inline">&bull; Satellite & Live Feeds</span>`;
    } else {
      badge.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping";
      text.innerHTML = `<strong class="text-amber-300">DISASTER OFFLINE MODE</strong> <span class="text-slate-400 hidden sm:inline">&bull; 100% Zero-Internet Active</span>`;
    }
  }
}

function toggleForceOfflineMode() {
  isForcedOffline = !isForcedOffline;
  updateNetworkStatusUI();
  if (isForcedOffline) {
    switchMapBaseLayer('offline');
    showToast("🛡️ Forced 100% Offline Tactical Mode. External tile requests blocked.", "alert");
  } else {
    if (navigator.onLine) {
      switchMapBaseLayer('satellite');
      showToast("🌐 Resumed Online Hybrid Mode. Satellite imagery enabled.", "success");
    } else {
      showToast("⚠️ Device is physically offline. Remains in Tactical Grid Mode.", "info");
    }
  }
}

// Export complete disaster database as a JSON file for USB / SD card field transfer
function exportDisasterDatabase() {
  const exportPayload = {
    app: "ResQHub Disaster Management Framework",
    version: "2.0-Offline",
    exportTimestamp: new Date().toISOString(),
    state: appState
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const timeKey = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadAnchor.setAttribute("download", `ResQHub-Disaster-Database-${timeKey}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast("💾 Offline disaster database exported! Ready for USB/SD card field transfer.", "success");
}

// Import database from JSON file (merges records without losing data)
function importDisasterDatabase(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      const incomingState = imported.state || imported;
      let mergedCount = 0;

      // Merge SOS alerts
      if (Array.isArray(incomingState.sosAlerts)) {
        const existingIds = new Set(appState.sosAlerts.map(x => x.id));
        incomingState.sosAlerts.forEach(sos => {
          if (!existingIds.has(sos.id)) {
            appState.sosAlerts.unshift(sos);
            existingIds.add(sos.id);
            mergedCount++;
          }
        });
      }

      // Merge Safe Check-ins
      if (Array.isArray(incomingState.safeCheckins)) {
        if (!appState.safeCheckins) appState.safeCheckins = [];
        const existingIds = new Set(appState.safeCheckins.map(x => x.id));
        incomingState.safeCheckins.forEach(chk => {
          if (!existingIds.has(chk.id)) {
            appState.safeCheckins.unshift(chk);
            existingIds.add(chk.id);
            mergedCount++;
          }
        });
      }

      // Merge Missing Persons
      if (Array.isArray(incomingState.missingPersons)) {
        const existingIds = new Set(appState.missingPersons.map(x => x.id));
        incomingState.missingPersons.forEach(mp => {
          if (!existingIds.has(mp.id)) {
            appState.missingPersons.unshift(mp);
            existingIds.add(mp.id);
            mergedCount++;
          }
        });
      }

      // Merge Damage Claims
      if (Array.isArray(incomingState.damageClaims)) {
        if (!appState.damageClaims) appState.damageClaims = [];
        const existingIds = new Set(appState.damageClaims.map(x => x.id));
        incomingState.damageClaims.forEach(clm => {
          if (!existingIds.has(clm.id)) {
            appState.damageClaims.unshift(clm);
            existingIds.add(clm.id);
            mergedCount++;
          }
        });
      }

      // Merge Volunteers
      if (Array.isArray(incomingState.volunteers)) {
        if (!appState.volunteers) appState.volunteers = [];
        const existingIds = new Set(appState.volunteers.map(x => x.id || x.phone));
        incomingState.volunteers.forEach(v => {
          const key = v.id || v.phone;
          if (!existingIds.has(key)) {
            appState.volunteers.push(v);
            existingIds.add(key);
            mergedCount++;
          }
        });
      }

      saveState();
      refreshAllViews();
      playEmergencyBeep('info');
      showToast(`📂 Merged ${mergedCount} field records from offline backup!`, "success");
      fileInput.value = '';
    } catch (err) {
      showToast(`⚠️ Error parsing backup file: ${err.message}`, "alert");
    }
  };
  reader.readAsText(file);
}

// Setup listeners when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Check Commander Authentication Gate
  checkAdminAuth();

  // Register PWA Service Worker for offline functionality
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol.startsWith('https'))) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('ResQHub Service Worker registered:', reg.scope))
      .catch(err => console.warn('Service Worker registration skipped:', err));
  }

  // Network status listeners
  window.addEventListener('online', updateNetworkStatusUI);
  window.addEventListener('offline', updateNetworkStatusUI);
  updateNetworkStatusUI();

  // Initialize Map
  initCrisisMap(appState, (lat, lng) => {
    const latInput = document.getElementById('sos-lat');
    const lngInput = document.getElementById('sos-lng');
    if (latInput && lngInput) {
      latInput.value = lat;
      lngInput.value = lng;
      showToast(`📍 Selected map coordinates: [${lat}, ${lng}]`, "info");
    }
  });

  // Setup form submissions
  setupForms();

  // Setup Missing Persons filter search
  const searchInput = document.getElementById('mp-search-input');
  const statusFilter = document.getElementById('mp-status-filter');
  if (searchInput && statusFilter) {
    const handleFilter = () => {
      renderMissingPersons(searchInput.value, statusFilter.value);
    };
    searchInput.addEventListener('input', handleFilter);
    statusFilter.addEventListener('change', handleFilter);
  }

  // Render all initial components
  refreshAllViews();

  // Always start background live sync with local server (works on http: and file:///)
  syncWithServer();
  serverSyncInterval = setInterval(syncWithServer, 500); // 500ms fast-poll safety net
  initSseEventStream(); // 0ms Instant Real-time SSE push stream

  // Fetch server IP and update UI elements
  fetch(`${SERVER_BASE}/api/info`)
    .then(r => r.json())
    .then(info => {
      const liveMobileUrl = info.tunnel ? `${info.tunnel}/user.html` : `${info.url}/user.html`;
      const urlEls = document.querySelectorAll('.wifi-server-url-text');
      urlEls.forEach(el => el.innerText = liveMobileUrl);
      const linkEls = document.querySelectorAll('.wifi-server-url-link');
      linkEls.forEach(el => el.href = liveMobileUrl);
      const cloudflareLinkEl = document.getElementById('link-cloudflare-mobile');
      if (cloudflareLinkEl) {
        cloudflareLinkEl.innerText = liveMobileUrl;
      }
      renderOfflineQrCode(liveMobileUrl);
    })
    .catch(() => {
      const fallbackUrl = "https://nor-iowa-delivers-nurse.trycloudflare.com/user.html";
      renderOfflineQrCode(fallbackUrl);
    });
});


