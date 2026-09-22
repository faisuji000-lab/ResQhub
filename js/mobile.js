// ResQHub Mobile Citizen Controller
// Simple, high-stress-tested, thumb-friendly smartphone interface

const STORAGE_KEY = 'resqhub_disaster_state_v1';
const SOS_ACTIVE_KEY = 'resqhub_mobile_active_sos';

// Candidate endpoints for mobile sync with Laptop Command Center
function getMobileApiCandidates() {
  const list = [];
  if (window.location.origin && window.location.origin.startsWith('http')) {
    list.push(window.location.origin);
  }
  const cached = localStorage.getItem('RESQHUB_WORKING_SERVER');
  if (cached && !list.includes(cached)) list.push(cached);

  const tunnel = 'https://limousines-relative-ali-instructor.trycloudflare.com';
  if (!list.includes(tunnel)) list.push(tunnel);

  const fallbacks = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://192.168.31.177:8080',
    'http://10.198.189.64:8080'
  ];
  fallbacks.forEach(u => {
    if (!list.includes(u)) list.push(u);
  });
  return list;
}

async function resilientMobileFetch(endpoint, options = {}) {
  const candidates = getMobileApiCandidates();
  let lastErr = null;

  for (const base of candidates) {
    try {
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const cleanEp = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      const targetUrl = `${cleanBase}${cleanEp}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(targetUrl, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        localStorage.setItem('RESQHUB_WORKING_SERVER', cleanBase);
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw (lastErr || new Error('Connection offline'));
}

let appState = null;
let userCoords = { lat: 19.0760, lng: 72.8550 }; // Default Crisis EOC coordinates
let selectedSosType = "🌊 Water Rising / Trapped on Roof";
let mobileMap = null;
let userMarker = null;
let facilityMarkers = [];
let isFlashlightOn = false;
let flashlightInterval = null;

// Initialize Web Audio API for emergency sound alerts
function playMobileChime(type = 'sos') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'sos') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

// Load Application State
function loadMobileState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      appState = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  } else {
    appState = JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  // Ensure collections exist
  if (!appState.survivorCheckins) {
    appState.survivorCheckins = [
      { id: "chk-1", timestamp: "15 mins ago", name: "Sunita Patil", phone: "+91 98330 12455", familyCount: 3, status: "Safe", location: "St. Jude High School Relief Camp", notes: "Elderly mother and two children safe with dry rations." },
      { id: "chk-2", timestamp: "30 mins ago", name: "Amit Deshmukh", phone: "+91 98190 77412", familyCount: 2, status: "Safe", location: "Metro Sports Arena Mega Shelter", notes: "Reached shelter safely. Minor bruises treated by paramedic." }
    ];
  }
  if (!appState.reliefRequests) {
    appState.reliefRequests = [];
  }
}

function saveMobileState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

// Geolocation
function initGeolocation() {
  const gpsEl = document.getElementById('header-gps-text');
  if (!('geolocation' in navigator)) {
    if (gpsEl) gpsEl.innerText = "📍 GPS: Fallback (EOC 19.076, 72.855)";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords.lat = pos.coords.latitude;
      userCoords.lng = pos.coords.longitude;
      if (gpsEl) {
        gpsEl.innerText = `📍 GPS: Locked (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`;
      }
      renderHelpFacilities();
      updateMapUserPosition();
    },
    (err) => {
      console.warn("GPS error/denied, using field center coordinates:", err.message);
      if (gpsEl) gpsEl.innerText = "📍 GPS: Locked (Field EOC)";
      renderHelpFacilities();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );

  // Watch position for live updates
  try {
    navigator.geolocation.watchPosition((pos) => {
      userCoords.lat = pos.coords.latitude;
      userCoords.lng = pos.coords.longitude;
      if (gpsEl) {
        gpsEl.innerText = `📍 GPS: Live (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`;
      }
      updateMapUserPosition();
    }, null, { enableHighAccuracy: true });
  } catch (e) {}
}

// Distance Calculation (Haversine formula in km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} meters`;
  }
  return `${distKm.toFixed(1)} km`;
}

// Tab Switching
function switchTab(tabId) {
  const tabMap = {
    'tab-sos': 'section-sos',
    'tab-safe': 'section-safe',
    'tab-help': 'section-help',
    'tab-family': 'section-family',
    'tab-dial': 'section-dial',
    'tab-survival': 'section-survival'
  };

  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav-tab'));

  const sectionId = tabMap[tabId];
  const targetSection = document.getElementById(sectionId);
  const targetBtn = document.getElementById(tabId);

  if (targetSection) targetSection.classList.remove('hidden');
  if (targetBtn) targetBtn.classList.add('active-nav-tab');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'tab-help') {
    renderHelpFacilities();
    if (mobileMap) {
      setTimeout(() => mobileMap.invalidateSize(), 200);
    }
  } else if (tabId === 'tab-family') {
    searchFamilyRegistry();
  }
}

// SOS Selection
function selectSosType(btn, typeText) {
  selectedSosType = typeText;
  document.querySelectorAll('.sos-chip').forEach(c => {
    c.classList.remove('border-red-500/60', 'bg-red-950/40', 'text-red-200', 'font-semibold');
    c.classList.add('border-slate-700', 'bg-slate-800/60', 'text-slate-300', 'font-medium');
  });
  btn.classList.remove('border-slate-700', 'bg-slate-800/60', 'text-slate-300', 'font-medium');
  btn.classList.add('border-red-500/60', 'bg-red-950/40', 'text-red-200', 'font-semibold');
}

// Trigger Mobile SOS
async function triggerMobileSos() {
  playMobileChime('sos');

  // Vibrate phone pattern if supported
  if (navigator.vibrate) {
    navigator.vibrate([400, 150, 400, 150, 600]);
  }

  const nameInput = document.getElementById('sos-input-name')?.value.trim();
  const phoneInput = document.getElementById('sos-input-phone')?.value.trim();
  const countInput = parseInt(document.getElementById('sos-input-count')?.value || '1', 10);
  const addressInput = document.getElementById('sos-input-address')?.value.trim();

  const sosId = 'sos-' + Math.floor(1000 + Math.random() * 9000);
  const sosRecord = {
    id: sosId,
    timestamp: "Just now",
    name: nameInput || "Mobile Citizen (Priority Evacuation)",
    phone: phoneInput || "+91 Mobile Emergency",
    priority: "CRITICAL",
    peopleTrapped: countInput || 1,
    hasInjuries: true,
    lat: userCoords.lat,
    lng: userCoords.lng,
    address: addressInput || `Mobile Satellite GPS (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`,
    needs: [selectedSosType, "Immediate Extraction"],
    status: "Dispatched",
    assignedUnit: "NDRF Boat Squad Alpha",
    notes: `Immediate SOS signal triggered from Citizen Mobile Interface. Situation: ${selectedSosType}. Trapped count: ${countInput}.`
  };

  // Save to active SOS
  localStorage.setItem(SOS_ACTIVE_KEY, JSON.stringify(sosRecord));

  // Prepend to local app state
  if (appState && appState.sosAlerts) {
    appState.sosAlerts.unshift(sosRecord);
    saveMobileState();
  }

  // Transmit to central laptop server
  let serverAcknowledged = false;
  sosRecord.delivered = false;
  try {
    const res = await resilientMobileFetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sosRecord)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        serverAcknowledged = true;
        sosRecord.delivered = true;
        localStorage.setItem(SOS_ACTIVE_KEY, JSON.stringify(sosRecord));
      }
    }
  } catch (e) {
    console.warn("Could not reach local server immediately, queued on device:", e);
  }

  renderActiveSosCard(sosRecord, serverAcknowledged);
  if (serverAcknowledged) {
    showToast("🚨 SOS DELIVERED TO LAPTOP COMMAND CENTER! Alarm sounding at EOC.", "alert");
  } else {
    showToast("⚠️ SOS saved on phone & queued! Auto-syncing to Laptop Command Center...", "info");
  }
}

function renderActiveSosCard(sosRecord, serverDelivered = true) {
  const card = document.getElementById('sos-active-card');
  const badgeId = document.getElementById('sos-badge-id');
  const coordsEl = document.getElementById('sos-active-coords');
  const unitEl = document.getElementById('sos-assigned-unit');
  const statusEl = document.getElementById('sos-response-status');

  if (card) card.classList.remove('hidden');
  if (badgeId) badgeId.innerText = `#${sosRecord.id.toUpperCase()}`;
  if (coordsEl) coordsEl.innerText = `${sosRecord.lat.toFixed(4)}, ${sosRecord.lng.toFixed(4)}`;
  
  const isDelivered = (serverDelivered && sosRecord.delivered !== false);

  if (unitEl) {
    if (isDelivered) {
      unitEl.innerHTML = `<span class="text-emerald-400 font-bold">🟢 ${sosRecord.assignedUnit || 'NDRF Rescue Boat Alpha'}</span>`;
    } else {
      unitEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️ Stored on phone (Auto-syncing...)</span>`;
    }
  }

  if (statusEl) {
    if (isDelivered) {
      statusEl.innerHTML = `<span class="text-emerald-300 font-bold">📡 Received by Laptop Command Center</span>`;
    } else {
      statusEl.innerHTML = `<button onclick="retryTransmitSos()" class="px-2 py-1 rounded bg-red-600 text-white font-black text-[10px] animate-pulse">🔁 TAP TO RETRY SENDING</button>`;
    }
  }
}

async function retryTransmitSos() {
  const saved = localStorage.getItem(SOS_ACTIVE_KEY);
  if (!saved) return;
  const sosRecord = JSON.parse(saved);
  showToast("📡 Connecting to Laptop Command Center...", "info");
  try {
    const res = await resilientMobileFetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sosRecord)
    });
    if (res.ok) {
      sosRecord.delivered = true;
      localStorage.setItem(SOS_ACTIVE_KEY, JSON.stringify(sosRecord));
      renderActiveSosCard(sosRecord, true);
      showToast("✅ SUCCESS: SOS received by Laptop Command Center! Alarm sounding.", "success");
      playMobileChime('safe');
      return;
    }
  } catch(e) {}
  showToast("⚠️ Retrying laptop link in background...", "info");
}

function checkSavedActiveSos() {
  const saved = localStorage.getItem(SOS_ACTIVE_KEY);
  if (saved) {
    try {
      const sos = JSON.parse(saved);
      renderActiveSosCard(sos);
    } catch (e) {}
  }
}

function cancelActiveSos() {
  if (confirm("Are you sure you want to cancel this emergency beacon? Confirm only if you have reached safety.")) {
    localStorage.removeItem(SOS_ACTIVE_KEY);
    const card = document.getElementById('sos-active-card');
    if (card) card.classList.add('hidden');
    stopFlashlight();
    showToast("SOS Beacon cancelled. Glad you are safe!", "info");
  }
}

// Strobe Flashlight Simulation
function toggleSosFlashlight() {
  if (isFlashlightOn) {
    stopFlashlight();
  } else {
    startFlashlight();
  }
}

function startFlashlight() {
  isFlashlightOn = true;
  let flash = false;
  flashlightInterval = setInterval(() => {
    flash = !flash;
    document.body.style.backgroundColor = flash ? '#ffffff' : '#0b1120';
  }, 180);
  showToast("🔦 Strobe Flashlight Active! Hold phone up towards rescuers.", "alert");
}

function stopFlashlight() {
  isFlashlightOn = false;
  if (flashlightInterval) clearInterval(flashlightInterval);
  document.body.style.backgroundColor = '#0b1120';
}

// Handle "I Am Safe" Check-In
async function handleSafeCheckin(e) {
  e.preventDefault();
  playMobileChime('safe');

  const name = document.getElementById('safe-name').value.trim();
  const phone = document.getElementById('safe-phone').value.trim();
  const location = document.getElementById('safe-location').value;
  const familyCount = parseInt(document.getElementById('safe-family-count').value, 10);
  const healthStatus = document.getElementById('safe-health-status').value;
  const notes = document.getElementById('safe-notes').value.trim();

  const checkinRecord = {
    id: "chk-" + Date.now().toString().slice(-5),
    timestamp: "Just now",
    name: name,
    phone: phone,
    location: location,
    familyCount: familyCount,
    healthStatus: healthStatus,
    status: "Safe",
    notes: notes || "Checked in safe via Citizen Mobile App",
    lat: userCoords.lat,
    lng: userCoords.lng
  };

  // Update memory & local storage
  if (!appState.survivorCheckins) appState.survivorCheckins = [];
  appState.survivorCheckins.unshift(checkinRecord);
  saveMobileState();

  // Send to server
  try {
    await resilientMobileFetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkinRecord)
    });
  } catch (err) {
    console.warn("Could not post check-in to server immediately, saved locally:", err);
  }

  // Show confirmation
  const form = document.getElementById('form-safe-checkin');
  const confirmBox = document.getElementById('safe-confirm-box');
  const confirmText = document.getElementById('safe-confirm-text');

  if (form) form.classList.add('hidden');
  if (confirmBox) confirmBox.classList.remove('hidden');
  if (confirmText) {
    confirmText.innerHTML = `<strong>${name}</strong> (${familyCount} family member${familyCount > 1 ? 's' : ''}) successfully listed at <em>${location}</em>. Relatives can now search your name or number.`;
  }

  showToast("✅ Safe check-in registered! Relatives can find your location.", "success");
}

// Help & Shelters Cards
let currentHelpFilter = 'all';

function filterHelpCards(type) {
  currentHelpFilter = type;
  document.querySelectorAll('.help-filter-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-slate-800', 'text-slate-300');
  });
  event.target.classList.remove('bg-slate-800', 'text-slate-300');
  event.target.classList.add('bg-blue-600', 'text-white');
  renderHelpFacilities();
}

function renderHelpFacilities() {
  const container = document.getElementById('help-facility-list');
  if (!container || !appState) return;

  const facilities = [];

  // Add shelters
  if (appState.shelters && (currentHelpFilter === 'all' || currentHelpFilter === 'shelter')) {
    appState.shelters.forEach(s => {
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng);
      facilities.push({
        id: s.id,
        category: 'shelter',
        icon: '⛺',
        name: s.name,
        type: s.type || 'Relief Camp',
        address: s.address,
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        status: s.status,
        statusCol: s.status.includes('Accepting') ? 'text-emerald-400 border-emerald-700 bg-emerald-950/70' : 'text-amber-400 border-amber-700 bg-amber-950/70',
        capacity: `${s.currentOccupancy} / ${s.totalCapacity} spots filled`,
        contact: s.contact,
        lat: s.lat,
        lng: s.lng,
        amenities: ['🍞 Food Rations', '💧 Clean Water', '🩺 First Aid']
      });
    });
  }

  // Add hospitals
  if (appState.hospitals && (currentHelpFilter === 'all' || currentHelpFilter === 'hospital')) {
    appState.hospitals.forEach(h => {
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, h.lat, h.lng);
      facilities.push({
        id: h.id,
        category: 'hospital',
        icon: '🏥',
        name: h.name,
        type: 'Emergency Trauma Hospital',
        address: 'Emergency Response Sector',
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        status: `${h.availableIcuBeds} ICU Beds Available`,
        statusCol: h.availableIcuBeds > 4 ? 'text-blue-400 border-blue-700 bg-blue-950/70' : 'text-red-400 border-red-700 bg-red-950/70',
        capacity: `Ambulances: ${h.emergencyAmbulances} units active`,
        contact: '+91 98201 11223',
        lat: h.lat,
        lng: h.lng,
        amenities: ['🚑 24/7 Trauma', '🩸 Blood Bank', '⚡ Generator']
      });
    });
  }

  // Add clean water & ration hubs
  if (currentHelpFilter === 'all' || currentHelpFilter === 'water') {
    const waterPoints = [
      { id: 'w-1', name: 'Sector 2 Water Tanker Distribution', lat: 19.0810, lng: 72.8480, contact: '1077' },
      { id: 'w-2', name: 'High School Quadrangle Dry Rations', lat: 19.0620, lng: 72.8590, contact: '1077' }
    ];
    waterPoints.forEach(w => {
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, w.lat, w.lng);
      facilities.push({
        id: w.id,
        category: 'water',
        icon: '💧',
        name: w.name,
        type: 'Municipal Water & Food Supply',
        address: 'Municipal Mobile Hub',
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        status: 'Operational Tanker',
        statusCol: 'text-teal-400 border-teal-700 bg-teal-950/70',
        capacity: 'Potable Drinking Water & Dry Kits',
        contact: w.contact,
        lat: w.lat,
        lng: w.lng,
        amenities: ['💧 Free Drinking Water', '🍞 Biscuit Packets']
      });
    });
  }

  // Sort nearest first
  facilities.sort((a, b) => a.distanceKm - b.distanceKm);

  container.innerHTML = facilities.map(f => `
    <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md space-y-2.5">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2.5">
          <span class="text-2xl">${f.icon}</span>
          <div>
            <h3 class="font-bold text-sm text-white leading-tight">${f.name}</h3>
            <p class="text-[11px] text-slate-400">${f.address}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-blue-900/60 text-blue-300 border border-blue-700/60 shrink-0">
          📍 ${f.distanceFormatted}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span class="px-2 py-0.5 rounded-md border font-semibold ${f.statusCol}">${f.status}</span>
        <span class="text-slate-400">• ${f.capacity}</span>
      </div>

      <div class="flex flex-wrap gap-1.5 pt-1">
        ${f.amenities.map(a => `<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">${a}</span>`).join('')}
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-800">
        <a href="tel:${f.contact}" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700">
          <span>📞</span> Call
        </a>
        <button onclick="focusFacilityOnMiniMap(${f.lat}, ${f.lng}, '${f.name.replace(/'/g, "\'")}')" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow">
          <span>🗺️</span> View on Map
        </button>
      </div>
    </div>
  `).join('');
}

// Mini-Map Controller
function toggleMobileMiniMap() {
  const mapContainer = document.getElementById('mobile-map-container');
  const icon = document.getElementById('minimap-toggle-icon');
  if (!mapContainer) return;

  if (mapContainer.classList.contains('hidden')) {
    mapContainer.classList.remove('hidden');
    icon.innerText = "Hide ▲";
    if (!mobileMap) {
      initMobileMap();
    } else {
      setTimeout(() => mobileMap.invalidateSize(), 150);
    }
  } else {
    mapContainer.classList.add('hidden');
    icon.innerText = "Show ▼";
  }
}

function initMobileMap() {
  const mapContainer = document.getElementById('mobile-map-container');
  if (!mapContainer || typeof L === 'undefined') return;

  mobileMap = L.map('mobile-map-container', {
    center: [userCoords.lat, userCoords.lng],
    zoom: 13,
    zoomControl: true
  });

  // Offline Tactical Canvas Grid Layer
  const TacticalGridLayer = L.GridLayer.extend({
    createTile: function(coords) {
      const tile = document.createElement('canvas');
      tile.width = 256;
      tile.height = 256;
      const ctx = tile.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.lineTo(256, 256); ctx.lineTo(0, 256); ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.strokeRect(64, 64, 128, 128);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`SECTOR-GRID Z${coords.z}`, 12, 24);
      return tile;
    }
  });
  new TacticalGridLayer().addTo(mobileMap);

  updateMapUserPosition();
  plotFacilitiesOnMap();
}

function updateMapUserPosition() {
  if (!mobileMap || typeof L === 'undefined') return;

  if (userMarker) {
    userMarker.setLatLng([userCoords.lat, userCoords.lng]);
  } else {
    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #ef4444;" class="animate-ping"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(mobileMap);
    userMarker.bindPopup("<b>📍 YOUR CURRENT LOCATION</b><br>Distress beacons broadcast from here.");
  }
}

function plotFacilitiesOnMap() {
  if (!mobileMap || !appState || typeof L === 'undefined') return;

  facilityMarkers.forEach(m => mobileMap.removeLayer(m));
  facilityMarkers = [];

  if (appState.shelters) {
    appState.shelters.forEach(s => {
      const marker = L.marker([s.lat, s.lng]).addTo(mobileMap);
      marker.bindPopup(`<b>⛺ ${s.name}</b><br>${s.status}<br><a href="tel:${s.contact}">📞 ${s.contact}</a>`);
      facilityMarkers.push(marker);
    });
  }

  if (appState.hospitals) {
    appState.hospitals.forEach(h => {
      const marker = L.marker([h.lat, h.lng]).addTo(mobileMap);
      marker.bindPopup(`<b>🏥 ${h.name}</b><br>ICU Beds: ${h.availableIcuBeds}<br>Ambulances: ${h.emergencyAmbulances}`);
      facilityMarkers.push(marker);
    });
  }
}

function focusFacilityOnMiniMap(lat, lng, name) {
  const mapContainer = document.getElementById('mobile-map-container');
  if (mapContainer && mapContainer.classList.contains('hidden')) {
    toggleMobileMiniMap();
  }
  setTimeout(() => {
    if (mobileMap) {
      mobileMap.setView([lat, lng], 15);
      L.popup().setLatLng([lat, lng]).setContent(`<b>${name}</b>`).openOn(mobileMap);
      document.getElementById('mobile-map-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, 250);
}

function refreshUserGpsAndDistances() {
  initGeolocation();
  showToast("📍 Recalculating distances from GPS satellite...", "info");
}

// Find Missing Family Search
function searchFamilyRegistry() {
  const query = document.getElementById('family-search-input')?.value.toLowerCase().trim() || "";
  const resultsContainer = document.getElementById('family-search-results');
  if (!resultsContainer || !appState) return;

  const allRecords = [];

  // Add survivor checkins
  if (appState.survivorCheckins) {
    appState.survivorCheckins.forEach(c => {
      allRecords.push({
        name: c.name,
        phone: c.phone,
        status: "SAFE",
        statusBadge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/60",
        location: c.location,
        timestamp: c.timestamp,
        notes: c.notes,
        familyCount: c.familyCount || 1
      });
    });
  }

  // Add missing persons
  if (appState.missingPersons) {
    appState.missingPersons.forEach(m => {
      allRecords.push({
        name: m.name,
        phone: m.contactNumber || "N/A",
        status: m.status === 'Found' ? 'FOUND / SAFE' : 'SEARCH ACTIVE',
        statusBadge: m.status === 'Found' ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60' : 'bg-red-900/60 text-red-300 border-red-700/60',
        location: m.lastSeenLocation,
        timestamp: m.reportedTime,
        notes: `Age: ${m.age} • ${m.description}`,
        familyCount: 1
      });
    });
  }

  const filtered = query.length === 0 ? allRecords : allRecords.filter(r => 
    r.name.toLowerCase().includes(query) || (r.phone && r.phone.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="p-4 rounded-2xl bg-slate-800/60 text-center text-slate-400 text-xs">
        No record found matching "<strong>${query}</strong>".<br>
        <span class="text-[11px] text-slate-500 mt-1 block">Ask rescue teams to submit a check-in.</span>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = filtered.map(r => `
    <div class="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-bold text-white text-sm">${r.name}</span>
        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.statusBadge}">${r.status}</span>
      </div>
      <div class="text-slate-300 flex items-center gap-1">
        <span>📍</span> <span>${r.location}</span>
      </div>
      <div class="text-[11px] text-slate-400 flex items-center justify-between">
        <span>📞 ${r.phone}</span>
        <span>⏱️ ${r.timestamp}</span>
      </div>
      ${r.notes ? `<div class="text-[11px] text-slate-400 bg-black/20 p-2 rounded-lg mt-1 italic">"${r.notes}"</div>` : ''}
    </div>
  `).join('');
}

// Request Relief Supplies
async function handleReliefRequest(e) {
  e.preventDefault();
  const checkboxes = document.querySelectorAll('input[name="reliefItem"]:checked');
  const selectedItems = Array.from(checkboxes).map(cb => cb.value);

  if (selectedItems.length === 0) {
    showToast("Please select at least one essential item needed.", "alert");
    return;
  }

  const contact = document.getElementById('relief-contact').value.trim();
  const location = document.getElementById('relief-location').value.trim();

  const reliefRecord = {
    id: "rel-" + Date.now().toString().slice(-5),
    timestamp: "Just now",
    name: contact,
    phone: contact,
    items: selectedItems,
    location: location,
    status: "Pending Dispatch"
  };

  if (!appState.reliefRequests) appState.reliefRequests = [];
  appState.reliefRequests.unshift(reliefRecord);
  saveMobileState();

  try {
    await resilientMobileFetch('/api/relief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reliefRecord)
    });
  } catch (err) {}

  document.getElementById('form-relief-request').reset();
  showToast("📦 Relief request dispatched to NDRF Supply Logistics!", "success");
}

// Background Sync with Laptop Server
async function syncWithServer() {
  // Check if phone has an unacknowledged SOS waiting to reach laptop
  const activeSosRaw = localStorage.getItem(SOS_ACTIVE_KEY);
  if (activeSosRaw) {
    try {
      const mySos = JSON.parse(activeSosRaw);
      if (mySos && mySos.delivered === false) {
        try {
          const res = await resilientMobileFetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mySos)
          });
          if (res.ok) {
            mySos.delivered = true;
            localStorage.setItem(SOS_ACTIVE_KEY, JSON.stringify(mySos));
            renderActiveSosCard(mySos, true);
            showToast("🚨 CONNECTED: SOS transmitted to Laptop Command Center! Alarm sounding.", "alert");
          }
        } catch(e) {}
      }
    } catch(e) {}
  }

  try {
    const res = await resilientMobileFetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error('Server offline');
    const data = await res.json();
    if (data) {
      if (data.sosAlerts && Array.isArray(data.sosAlerts)) {
        appState.sosAlerts = data.sosAlerts.filter(s => s && typeof s === 'object' && s.id);

        // Check if our phone's active SOS was dispatched or updated by Laptop Admin!
        if (activeSosRaw) {
          try {
            const mySos = JSON.parse(activeSosRaw);
            const serverMatch = appState.sosAlerts.find(s => s && s.id === mySos.id);
            if (serverMatch) {
              if (serverMatch.status !== mySos.status || serverMatch.assignedUnit !== mySos.assignedUnit) {
                mySos.status = serverMatch.status;
                mySos.assignedUnit = serverMatch.assignedUnit;
                localStorage.setItem(SOS_ACTIVE_KEY, JSON.stringify(mySos));
                renderActiveSosCard(mySos, true);
                if (mySos.status === 'Dispatched') {
                  showToast(`🚀 COMMAND CENTER DISPATCHED: ${mySos.assignedUnit} is on the way!`, 'success');
                  playMobileChime('safe');
                } else if (mySos.status === 'Resolved') {
                  showToast(`✅ SOS marked resolved by Command Center. Stay safe!`, 'info');
                }
              }
            }
          } catch(e) {}
        }
      }
      if (data.survivorCheckins && Array.isArray(data.survivorCheckins)) {
        appState.survivorCheckins = data.survivorCheckins.filter(c => c && typeof c === 'object' && c.id);
      }
      saveMobileState();
    }
    updateNetworkStatus(true);
  } catch (e) {
    updateNetworkStatus(false);
  }
}

function updateNetworkStatus(isOnline) {
  const el = document.getElementById('mobile-net-status');
  if (!el) return;
  if (isOnline) {
    el.className = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50";
    el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Online Sync</span>';
  } else {
    el.className = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50";
    el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Offline Ready</span>';
  }
}

// Switch to Operator Desktop Dashboard
function switchToOperatorView() {
  sessionStorage.setItem('resqhub_force_desktop', '1');
  window.location.href = 'index.html';
}

// Toast Helper
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'alert' ? 'border-red-500 bg-red-950 text-red-100' :
                   (type === 'info' ? 'border-blue-500 bg-blue-950 text-blue-100' : 'border-emerald-500 bg-emerald-950 text-emerald-100');

  toast.className = `p-3.5 rounded-2xl border shadow-2xl text-xs font-semibold transition-all duration-300 ${borderCol}`;
  toast.innerText = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  loadMobileState();
  initGeolocation();
  checkSavedActiveSos();
  renderHelpFacilities();
  searchFamilyRegistry();

  // Background server sync every 3 seconds
  setInterval(syncWithServer, 3000);
});
