// Advanced Geospatial Crisis Map with Real-World Reality Integration & 100% Offline Tactical Grid

let mapInstance = null;
let baseLayers = {};
let currentBaseLayerName = 'satellite';
let hybridLabelsLayer = null;

// Overlay layer groups
let markerLayerGroup = null;
let hazardLayerGroup = null;
let earthquakeLayerGroup = null;
let radarLayerInstance = null;
let userLocationLayerGroup = null;
let offlineVectorLayerGroup = null;

// Status flags
let isEarthquakesActive = false;
let isRadarActive = false;
let userRealCoords = null;

function initCrisisMap(state, onMapLocationSelect) {
  const defaultCenter = [19.0760, 72.8550];

  // 1. Create Base Layers
  // Photorealistic Esri World Imagery (for online mode)
  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
    maxZoom: 18
  });

  // Esri Hybrid Labels (roads, cities, boundaries)
  hybridLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    opacity: 0.85
  });

  // Tactical Dark Matter
  const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    maxZoom: 19
  });

  // Standard OpenStreetMap
  const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  });

  // OpenTopoMap (Elevation Contours)
  const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  });

  // 100% OFFLINE DISASTER TACTICAL VECTOR CANVAS GRID (Zero Network Requests)
  const offlineTacticalGrid = L.gridLayer({
    attribution: 'ResQHub Disaster Tactical Vector Grid (100% Offline Mode)',
    tileSize: 256,
    maxZoom: 18,
    minZoom: 10
  });

  offlineTacticalGrid.createTile = function(coords) {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    const ctx = tile.getContext('2d');

    // Tactical dark canvas terrain background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, 256, 256);

    // Primary tactical grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 128); ctx.lineTo(256, 128);
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.stroke();

    // Sub-grid lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, 256, 256);

    // Tactical corner ticks
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 128); ctx.lineTo(136, 128);
    ctx.moveTo(128, 120); ctx.lineTo(128, 136);
    ctx.stroke();

    // Geodetic grid cell coordinate label
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';
    ctx.fillText(`+ Z${coords.z} [${coords.x},${coords.y}]`, 8, 18);

    return tile;
  };

  baseLayers = {
    satellite: esriSatellite,
    dark: darkMatter,
    street: openStreetMap,
    topo: openTopoMap,
    offline: offlineTacticalGrid
  };

  // Determine initial layer based on online/offline state
  const isOnline = navigator.onLine;
  currentBaseLayerName = isOnline ? 'satellite' : 'offline';
  const initialBaseLayer = isOnline ? esriSatellite : offlineTacticalGrid;
  const initialLayers = isOnline ? [initialBaseLayer, hybridLabelsLayer] : [initialBaseLayer];

  // Initialize Map
  mapInstance = L.map('crisis-map', {
    center: defaultCenter,
    zoom: 13,
    zoomControl: true,
    scrollWheelZoom: true,
    layers: initialLayers
  });

  // Layer groups for dynamic data
  markerLayerGroup = L.layerGroup().addTo(mapInstance);
  hazardLayerGroup = L.layerGroup().addTo(mapInstance);
  earthquakeLayerGroup = L.layerGroup().addTo(mapInstance);
  userLocationLayerGroup = L.layerGroup().addTo(mapInstance);
  offlineVectorLayerGroup = L.layerGroup().addTo(mapInstance);

  // Render static hazard zones
  renderHazardZones();

  // Render offline tactical vector sector map
  renderOfflineVectorMap(state);

  // Render all scenario markers (shelters, hospitals, SOS)
  refreshMapMarkers(state);

  // Update map layer buttons UI
  updateLayerButtonsUI(currentBaseLayerName);

  // Map click listener for coordinate picking
  mapInstance.on('click', function(e) {
    const { lat, lng } = e.latlng;
    if (onMapLocationSelect) {
      onMapLocationSelect(lat.toFixed(4), lng.toFixed(4));
    }
  });

  // Automatically switch to offline grid if network goes offline
  window.addEventListener('offline', () => {
    if (currentBaseLayerName !== 'offline') {
      switchMapBaseLayer('offline');
      if (typeof showToast === 'function') {
        showToast("📶 Internet disconnected: Switched to 100% Offline Tactical Grid", "alert");
      }
    }
  });

  // Trigger resize fix
  setTimeout(() => {
    mapInstance.invalidateSize();
  }, 300);
}

// Render Offline Vector Sector Map (Highways, River Basin & Evacuation Sectors)
function renderOfflineVectorMap(state) {
  if (!offlineVectorLayerGroup) return;
  offlineVectorLayerGroup.clearLayers();

  // 1. Coastline vector
  const coastline = [
    [19.1600, 72.8050],
    [19.1200, 72.8120],
    [19.0800, 72.8190],
    [19.0400, 72.8220],
    [18.9800, 72.8100],
    [18.9400, 72.8200]
  ];
  L.polyline(coastline, {
    color: '#38bdf8',
    weight: 2.5,
    opacity: 0.85,
    dashArray: '6, 4'
  }).bindPopup("<strong>🌊 Western Coastline & Tidal Ingress Margin</strong><br><span class='text-xs text-slate-400'>Tactical Shoreline Reference (Offline Vector)</span>").addTo(offlineVectorLayerGroup);

  // 2. Mithi River Drainage & Flash Flood Channel
  const mithiRiver = [
    [19.1250, 72.8800],
    [19.0950, 72.8650],
    [19.0700, 72.8520],
    [19.0550, 72.8420],
    [19.0450, 72.8350]
  ];
  L.polyline(mithiRiver, {
    color: '#60a5fa',
    weight: 4.5,
    opacity: 0.95
  }).bindPopup("<strong>⚠️ Primary River Basin Flood Channel (Mithi River)</strong><br><span class='text-xs text-slate-400'>Current Water Level: 3.8m above safety datum</span>").addTo(offlineVectorLayerGroup);

  // 3. Render Offline Sector Boundaries
  const sectors = (state && state.offlineSectors) ? state.offlineSectors : (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.offlineSectors : []);
  if (sectors && Array.isArray(sectors)) {
    sectors.forEach(sec => {
      const poly = L.polygon(sec.coords, {
        color: sec.color,
        weight: 1.5,
        fillColor: sec.color,
        fillOpacity: 0.08,
        dashArray: '5, 4'
      }).bindPopup(`
        <div class="p-1.5 text-xs text-slate-200">
          <div class="font-bold text-sm" style="color:${sec.color}">${sec.name}</div>
          <div class="mt-1 text-slate-300"><strong>Status:</strong> ${sec.status}</div>
          <div class="text-[10px] text-slate-400 mt-1">Tactical GIS Sector Boundary (Offline)</div>
        </div>
      `);
      poly.addTo(offlineVectorLayerGroup);

      // Add Sector Tactical Label Marker
      const centerLat = (sec.coords[0][0] + sec.coords[2][0]) / 2;
      const centerLng = (sec.coords[0][1] + sec.coords[2][1]) / 2;
      const labelIcon = L.divIcon({
        className: 'sector-tactical-label',
        html: `<div style="background: rgba(11,17,32,0.85); border: 1px solid ${sec.color}; color: ${sec.color}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; font-family: monospace;">${sec.id.toUpperCase()}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });
      L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(offlineVectorLayerGroup);
    });
  }
}

// Switch Photorealistic / Tactical Base Layers
function switchMapBaseLayer(layerKey) {
  if (!mapInstance || !baseLayers[layerKey]) return;

  // Remove existing base layers
  Object.values(baseLayers).forEach(layer => {
    if (mapInstance.hasLayer(layer)) {
      mapInstance.removeLayer(layer);
    }
  });

  // Add selected base layer
  baseLayers[layerKey].addTo(mapInstance);
  currentBaseLayerName = layerKey;

  // Handle hybrid labels and offline vector overlays
  if (layerKey === 'satellite' || layerKey === 'dark') {
    if (!mapInstance.hasLayer(hybridLabelsLayer)) {
      hybridLabelsLayer.addTo(mapInstance);
    }
  } else {
    if (mapInstance.hasLayer(hybridLabelsLayer)) {
      mapInstance.removeLayer(hybridLabelsLayer);
    }
  }

  // If switched to offline grid, ensure offline vector features are visible
  if (layerKey === 'offline') {
    if (!mapInstance.hasLayer(offlineVectorLayerGroup)) {
      offlineVectorLayerGroup.addTo(mapInstance);
    }
  }

  // Update button active UI
  updateLayerButtonsUI(layerKey);
}

function updateLayerButtonsUI(layerKey) {
  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    if (btn.dataset.layer === layerKey) {
      btn.className = "map-layer-btn px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white shadow";
    } else {
      btn.className = "map-layer-btn px-2.5 py-1 text-xs font-medium rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300";
    }
  });
}

// Live Weather & Precipitation Radar Overlay (Online RainViewer or Offline Storm Simulation)
async function toggleLiveRadarOverlay() {
  if (!mapInstance) return false;

  if (isRadarActive) {
    if (radarLayerInstance && mapInstance.hasLayer(radarLayerInstance)) {
      mapInstance.removeLayer(radarLayerInstance);
      radarLayerInstance = null;
    }
    isRadarActive = false;
    updateRadarButtonUI(false);
    return { active: false, mode: 'off' };
  }

  // 1. Attempt Online Fetch if connected
  if (navigator.onLine) {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await res.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        const latestFrame = data.radar.past[data.radar.past.length - 1];
        const radarTileUrl = `https://tilecache.rainviewer.com${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

        radarLayerInstance = L.tileLayer(radarTileUrl, {
          opacity: 0.72,
          zIndex: 20
        }).addTo(mapInstance);

        isRadarActive = true;
        updateRadarButtonUI(true, 'ONLINE');
        return { active: true, mode: 'online' };
      }
    } catch (err) {
      console.warn("RainViewer online feed unreachable, falling back to offline storm simulation...", err);
    }
  }

  // 2. OFFLINE DISASTER RADAR FALLBACK (Simulated Cyclone Spiral & Storm Front)
  radarLayerInstance = L.layerGroup();
  
  const stormCenter = [19.0760, 72.8000];
  const bands = [
    { radius: 26000, color: '#38bdf8', fill: '#0284c7', opacity: 0.15, desc: "Outer Rainband (Precipitation: 35 mm/h)" },
    { radius: 17000, color: '#fbbf24', fill: '#d97706', opacity: 0.25, desc: "Intense Torrential Surge (Precipitation: 75 mm/h)" },
    { radius: 8500, color: '#ef4444', fill: '#b91c1c', opacity: 0.38, desc: "Cyclone Eyewall Core (Precipitation: 140 mm/h - Wind: 145 km/h)" }
  ];

  bands.forEach(b => {
    L.circle(stormCenter, {
      radius: b.radius,
      color: b.color,
      fillColor: b.fill,
      fillOpacity: b.opacity,
      weight: 2,
      dashArray: '5, 5'
    }).bindPopup(`<strong>🌪️ ${b.desc}</strong><br><span class="text-xs text-amber-300">Tactical Radar Projection (Disaster Offline Mode)</span>`).addTo(radarLayerInstance);
  });

  radarLayerInstance.addTo(mapInstance);
  isRadarActive = true;
  updateRadarButtonUI(true, 'OFFLINE');
  return { active: true, mode: 'offline' };
}

function updateRadarButtonUI(active, mode = 'ONLINE') {
  const btn = document.getElementById('btn-toggle-radar');
  if (!btn) return;
  if (active) {
    const badge = mode === 'OFFLINE' ? 'Radar (Offline Simulation)' : 'Radar: ON';
    btn.className = "px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white shadow flex items-center gap-1.5 border border-emerald-400";
    btn.innerHTML = `<span>🌧️</span> ${badge}`;
  } else {
    btn.className = "px-2.5 py-1 text-xs font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700";
    btn.innerHTML = `<span>🌧️</span> Rain Radar: OFF`;
  }
}

// Live Real-World USGS Earthquakes Feed Integration (with Offline Regional Telemetry Fallback)
async function toggleLiveEarthquakes() {
  if (!mapInstance) return false;

  if (isEarthquakesActive) {
    earthquakeLayerGroup.clearLayers();
    isEarthquakesActive = false;
    updateEarthquakeButtonUI(false, 0);
    return { active: false, count: 0, mode: 'off' };
  }

  earthquakeLayerGroup.clearLayers();

  // 1. Attempt Online USGS Feed if network is active
  if (navigator.onLine) {
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const geojson = await res.json();
      const count = geojson.features.length;

      geojson.features.forEach(eq => {
        const mag = eq.properties.mag;
        const place = eq.properties.place;
        const timeStr = new Date(eq.properties.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const depth = eq.geometry.coordinates[2];
        const lat = eq.geometry.coordinates[1];
        const lng = eq.geometry.coordinates[0];

        const size = Math.max(22, Math.min(48, Math.round(mag * 7)));
        let color = '#f59e0b';
        if (mag >= 5.5) color = '#ef4444';
        else if (mag >= 4.5) color = '#f97316';

        const customIcon = L.divIcon({
          className: 'usgs-marker-wrapper',
          html: `
            <div class="usgs-marker-container" style="width: ${size}px; height: ${size}px;">
              <div class="usgs-marker-core" style="width: ${size}px; height: ${size}px; background-color: ${color}; font-size: ${Math.max(10, size / 2.5)}px;">
                ${mag.toFixed(1)}
              </div>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });
        marker.bindPopup(`
          <div class="p-2 text-slate-200 min-w-[210px]">
            <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
              <span class="font-bold text-sm text-amber-400">⚡ M ${mag.toFixed(1)} Earthquake</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${timeStr}</span>
            </div>
            <div class="text-xs space-y-1">
              <div><strong class="text-slate-400">Location:</strong> ${place}</div>
              <div><strong class="text-slate-400">Depth:</strong> ${depth.toFixed(1)} km</div>
              <div><strong class="text-slate-400">Coordinates:</strong> [${lat.toFixed(3)}, ${lng.toFixed(3)}]</div>
            </div>
            <div class="mt-2 text-[10px] text-slate-400 border-t border-slate-700 pt-1">
              Source: <a href="${eq.properties.url}" target="_blank" class="text-blue-400 underline">USGS Real-time Seismology</a>
            </div>
          </div>
        `);
        marker.addTo(earthquakeLayerGroup);
      });

      isEarthquakesActive = true;
      updateEarthquakeButtonUI(true, count, 'ONLINE');
      return { active: true, count, mode: 'online' };
    } catch (err) {
      console.warn("USGS feed offline, falling back to cached seismic telemetry...", err);
    }
  }

  // 2. OFFLINE REGIONAL SEISMIC TELEMETRY FALLBACK
  const fallbackList = (typeof INITIAL_DATA !== 'undefined' && INITIAL_DATA.offlineEarthquakes) ? INITIAL_DATA.offlineEarthquakes : [];
  fallbackList.forEach(eq => {
    const color = eq.alert === 'red' ? '#ef4444' : (eq.alert === 'orange' ? '#f97316' : '#f59e0b');
    const size = Math.max(24, Math.round(eq.mag * 6.5));

    const customIcon = L.divIcon({
      className: 'usgs-marker-wrapper',
      html: `
        <div class="usgs-marker-container" style="width: ${size}px; height: ${size}px;">
          <div class="usgs-marker-core" style="width: ${size}px; height: ${size}px; background-color: ${color}; font-size: ${Math.max(10, size / 2.5)}px;">
            ${eq.mag.toFixed(1)}
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([eq.lat, eq.lng], { icon: customIcon });
    marker.bindPopup(`
      <div class="p-2 text-slate-200 min-w-[210px]">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
          <span class="font-bold text-sm text-amber-400">⚡ M ${eq.mag.toFixed(1)} Seismic Tremor</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${eq.time}</span>
        </div>
        <div class="text-xs space-y-1">
          <div><strong class="text-slate-400">Location:</strong> ${eq.place}</div>
          <div><strong class="text-slate-400">Depth:</strong> ${eq.depth} km</div>
          <div><strong class="text-slate-400">Coordinates:</strong> [${eq.lat.toFixed(3)}, ${eq.lng.toFixed(3)}]</div>
          <div class="text-emerald-400 font-medium text-[10px] mt-1">📡 Fault Telemetry (Disaster Offline Mode)</div>
        </div>
      </div>
    `);
    marker.addTo(earthquakeLayerGroup);
  });

  isEarthquakesActive = true;
  updateEarthquakeButtonUI(true, fallbackList.length, 'OFFLINE');
  return { active: true, count: fallbackList.length, mode: 'offline' };
}

function updateEarthquakeButtonUI(active, count, mode = 'ONLINE') {
  const btn = document.getElementById('btn-toggle-usgs');
  if (!btn) return;
  if (active) {
    const label = mode === 'OFFLINE' ? `Earthquakes (${count} Offline Telemetry)` : `Live Earthquakes: ${count} Active`;
    btn.className = "px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white shadow flex items-center gap-1.5 border border-amber-400";
    btn.innerHTML = `<span>🔴</span> ${label}`;
  } else {
    btn.className = "px-2.5 py-1 text-xs font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700";
    btn.innerHTML = `<span>🔴</span> Live Earthquakes: OFF`;
  }
}

// Real-Life GPS Geolocation Detection
function locateUserInRealWorld(onSuccess, onError) {
  if (!navigator.geolocation) {
    if (onError) onError("Geolocation is not supported by your browser");
    return;
  }

  userLocationLayerGroup.clearLayers();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      userRealCoords = { lat: latitude, lng: longitude, accuracy };

      // User location pulsing marker
      const customIcon = L.divIcon({
        className: 'user-marker-wrapper',
        html: `
          <div class="user-marker-container">
            <div class="user-marker-pulse"></div>
            <div class="user-marker-core"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const userMarker = L.marker([latitude, longitude], { icon: customIcon });
      userMarker.bindPopup(`
        <div class="p-2 text-slate-200">
          <div class="font-bold text-blue-400 text-sm border-b border-slate-700 pb-1 mb-1.5">📍 Your Real-World Location</div>
          <div class="text-xs space-y-1">
            <div><strong>Coordinates:</strong> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
            <div><strong>GPS Accuracy:</strong> within ~${Math.round(accuracy)} meters</div>
            <div class="text-emerald-400 font-semibold mt-1">Real-time GPS locked</div>
          </div>
        </div>
      `);

      // Accuracy radius circle
      const accuracyCircle = L.circle([latitude, longitude], {
        radius: Math.max(accuracy, 100),
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '3, 4'
      });

      userMarker.addTo(userLocationLayerGroup);
      accuracyCircle.addTo(userLocationLayerGroup);

      // Smooth zoom to user's real location
      mapInstance.flyTo([latitude, longitude], 14, { duration: 1.5 });

      if (onSuccess) onSuccess(latitude, longitude, accuracy);
    },
    (err) => {
      console.warn("Browser GPS permission error or file:// restriction, attempting fallback...", err);

      const fallbackToCrisisCenter = () => {
        const lat = 19.0760;
        const lng = 72.8550;
        userRealCoords = { lat, lng, accuracy: 250 };

        const customIcon = L.divIcon({
          className: 'user-marker-wrapper',
          html: `
            <div class="user-marker-container">
              <div class="user-marker-pulse" style="border-color: #f59e0b;"></div>
              <div class="user-marker-core" style="background: #f59e0b;"></div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const userMarker = L.marker([lat, lng], { icon: customIcon });
        userMarker.bindPopup(`
          <div class="p-2 text-slate-200">
            <div class="font-bold text-amber-400 text-sm border-b border-slate-700 pb-1 mb-1.5">📍 Field EOC Center (Offline Lock)</div>
            <div class="text-xs space-y-1">
              <div><strong>Location:</strong> Crisis Field Command Center (Sector 2)</div>
              <div><strong>Coordinates:</strong> [19.0760, 72.8550]</div>
              <div class="text-emerald-400 font-semibold mt-1">Disaster Offline Mode Active</div>
            </div>
          </div>
        `);

        userMarker.addTo(userLocationLayerGroup);
        mapInstance.flyTo([lat, lng], 14, { duration: 1.5 });
        if (onSuccess) onSuccess(lat, lng, 250);
      };

      // Fallback to IP-based approximate geolocation if online, else use Crisis Center
      if (navigator.onLine) {
        fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(res => res.json())
          .then(data => {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            const city = data.city || data.region || "Your Area";
            userRealCoords = { lat, lng, accuracy: 5000 };

            const customIcon = L.divIcon({
              className: 'user-marker-wrapper',
              html: `
                <div class="user-marker-container">
                  <div class="user-marker-pulse"></div>
                  <div class="user-marker-core"></div>
                </div>
              `,
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            });

            const userMarker = L.marker([lat, lng], { icon: customIcon });
            userMarker.bindPopup(`
              <div class="p-2 text-slate-200">
                <div class="font-bold text-blue-400 text-sm border-b border-slate-700 pb-1 mb-1.5">📍 Location Detected (IP Geolocation)</div>
                <div class="text-xs space-y-1">
                  <div><strong>Region:</strong> ${city}, ${data.country || ''}</div>
                  <div><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                  <div class="text-amber-300 text-[11px] mt-1">Estimated via network connection</div>
                </div>
              </div>
            `);

            const accuracyCircle = L.circle([lat, lng], {
              radius: 5000,
              color: '#3b82f6',
              fillColor: '#60a5fa',
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '4, 4'
            });

            userMarker.addTo(userLocationLayerGroup);
            accuracyCircle.addTo(userLocationLayerGroup);

            mapInstance.flyTo([lat, lng], 13, { duration: 1.5 });
            if (onSuccess) onSuccess(lat, lng, 5000);
          })
          .catch(() => fallbackToCrisisCenter());
      } else {
        fallbackToCrisisCenter();
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

// Render Hazard Zones
function renderHazardZones() {
  hazardLayerGroup.clearLayers();

  const floodZone = L.circle([19.0650, 72.8420], {
    color: '#ef4444',
    fillColor: '#f87171',
    fillOpacity: 0.28,
    radius: 2200,
    weight: 2,
    dashArray: '6, 6'
  }).bindPopup(`
    <div class="p-2 text-xs">
      <div class="font-bold text-red-400 text-sm mb-1">⚠️ High Inundation Zone (Sector 3 & 4)</div>
      <div>Water surge height: <strong>2.5m - 3.8m</strong></div>
      <div>Risk Level: <span class="text-red-400 font-bold">EXTREME FLOODING</span></div>
      <div class="mt-1 text-slate-300">Mandatory evacuation active. Road transit prohibited.</div>
    </div>
  `);

  const warningZone = L.circle([19.0980, 72.8700], {
    color: '#f59e0b',
    fillColor: '#fbbf24',
    fillOpacity: 0.18,
    radius: 1800,
    weight: 1.5,
    dashArray: '4, 4'
  }).bindPopup(`
    <div class="p-2 text-xs">
      <div class="font-bold text-amber-400 text-sm mb-1">⚠️ Waterlogging & High Wind Alert</div>
      <div>Wind gusts: <strong>Up to 90 km/h</strong></div>
      <div>Risk Level: <span class="text-amber-400 font-bold">MODERATE VULNERABILITY</span></div>
    </div>
  `);

  floodZone.addTo(hazardLayerGroup);
  warningZone.addTo(hazardLayerGroup);
}

// Render Shelters, Hospitals & SOS Beacons
function refreshMapMarkers(state) {
  if (!markerLayerGroup) return;
  markerLayerGroup.clearLayers();

  // 1. Shelters
  state.shelters.forEach(shelter => {
    const isNearFull = shelter.currentOccupancy >= (shelter.totalCapacity * 0.9);
    const customIcon = L.divIcon({
      className: 'shelter-icon-wrapper',
      html: `<div class="shelter-marker-icon ${isNearFull ? 'shelter-marker-full' : ''}" title="${shelter.name}">🏠</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([shelter.lat, shelter.lng], { icon: customIcon });
    const percentFilled = Math.round((shelter.currentOccupancy / shelter.totalCapacity) * 100);

    marker.bindPopup(`
      <div class="p-2 text-slate-200">
        <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1 mb-2">
          <span class="font-bold text-emerald-400 text-sm">${shelter.name}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded ${isNearFull ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'}">
            ${percentFilled}% Full
          </span>
        </div>
        <div class="text-xs space-y-1">
          <div><strong class="text-slate-400">Address:</strong> ${shelter.address}</div>
          <div><strong class="text-slate-400">Occupancy:</strong> ${shelter.currentOccupancy} / ${shelter.totalCapacity} beds</div>
          <div class="flex gap-2 text-[11px] text-slate-300 mt-1">
            <span>🍞 Food: ${shelter.supplies.foodDays}d</span>
            <span>💧 Water: ${shelter.supplies.cleanWaterLiters.toLocaleString()}L</span>
          </div>
          <div class="pt-1 text-[11px] text-emerald-300">📞 ${shelter.contact}</div>
        </div>
      </div>
    `);
    marker.addTo(markerLayerGroup);
  });

  // 2. Hospitals
  state.hospitals.forEach(hosp => {
    const customIcon = L.divIcon({
      className: 'hospital-icon-wrapper',
      html: `<div class="hospital-marker-icon" title="${hosp.name}">🏥</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([hosp.lat, hosp.lng], { icon: customIcon });
    marker.bindPopup(`
      <div class="p-2 text-slate-200">
        <div class="font-bold text-blue-400 text-sm border-b border-slate-700 pb-1 mb-2">${hosp.name}</div>
        <div class="text-xs space-y-1">
          <div><strong class="text-slate-400">Available ICU Beds:</strong> <span class="text-white font-bold">${hosp.availableIcuBeds}</span> / ${hosp.totalIcuBeds}</div>
          <div><strong class="text-slate-400">Blood Bank:</strong> <span class="text-red-300">${hosp.bloodStockStatus}</span></div>
          <div><strong class="text-slate-400">Ambulances Ready:</strong> ${hosp.emergencyAmbulances} units</div>
          <div><strong class="text-slate-400">Generator:</strong> ${hosp.generatorBackup}</div>
        </div>
      </div>
    `);
    marker.addTo(markerLayerGroup);
  });

  // 3. SOS Alerts (Pulsing Red)
  state.sosAlerts.forEach(sos => {
    const priorityColor = sos.priority === 'CRITICAL' ? '#ef4444' : (sos.priority === 'HIGH' ? '#f97316' : '#eab308');
    
    const customIcon = L.divIcon({
      className: 'sos-icon-wrapper',
      html: `
        <div class="sos-marker-container">
          <div class="sos-marker-pulse" style="background-color: ${priorityColor}66;"></div>
          <div class="sos-marker-core" style="background-color: ${priorityColor};"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([sos.lat, sos.lng], { icon: customIcon });
    marker.bindPopup(`
      <div class="p-2 text-slate-200 min-w-[220px]">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
          <span class="font-bold text-sm text-red-400">🚨 SOS: ${sos.priority}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono bg-red-950 text-red-300 border border-red-800">${sos.timestamp}</span>
        </div>
        <div class="text-xs space-y-1.5">
          <div><strong class="text-slate-400">Caller:</strong> ${sos.name} (<a href="tel:${sos.phone}" class="text-blue-400 underline">${sos.phone}</a>)</div>
          <div><strong class="text-slate-400">Trapped Persons:</strong> <span class="font-bold text-amber-300">${sos.peopleTrapped} people</span> ${sos.hasInjuries ? '<span class="text-red-400 font-bold ml-1">(Injured!)</span>' : ''}</div>
          <div><strong class="text-slate-400">Location:</strong> ${sos.address}</div>
          <div class="text-[11px] bg-slate-800 p-1.5 rounded border border-slate-700 text-slate-300 italic">
            "${sos.notes}"
          </div>
          <div class="flex flex-wrap gap-1 pt-1">
            ${(Array.isArray(sos.needs) ? sos.needs : (sos.needs ? [sos.needs] : ['Emergency Rescue'])).map(n => `<span class="bg-slate-700 text-[10px] px-1.5 py-0.5 rounded text-slate-200">${n}</span>`).join('')}
          </div>
          <div class="pt-2 flex items-center justify-between border-t border-slate-700 mt-2">
            <span class="text-[11px] text-slate-400">Unit: <strong class="text-emerald-400">${sos.assignedUnit || 'Unassigned'}</strong></span>
            <span class="text-[11px] px-2 py-0.5 rounded ${sos.status === 'Dispatched' ? 'bg-blue-900 text-blue-200' : 'bg-amber-900 text-amber-200'}">${sos.status}</span>
          </div>
        </div>
      </div>
    `);
    marker.addTo(markerLayerGroup);
  });
}

function focusMapOnCoordinate(lat, lng, zoomLevel = 15) {
  if (mapInstance) {
    mapInstance.flyTo([lat, lng], zoomLevel, { duration: 1.2 });
  }
}

// Alias for global access
window.focusLocation = focusMapOnCoordinate;
window.focusMapOnCoordinate = focusMapOnCoordinate;

