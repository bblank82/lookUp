import maplibregl from 'maplibre-gl';
import { fetchNearbyAircraft, processFlightData } from './utils/api.js';
import { calculateDistance, calculateBearing, createVisibilityArc, isWithinArc } from './utils/calculations.js';
import { createFlightCard, getPlaneIcon } from './utils/ui-renderer.js';

// Configuration
let userLocation = null;
let actualLocation = null; // Store GPS location
let manualMode = false;
let map = null;
let userMarker = null;
let markers = {};
let currentRadius = 20; // NM
let minAltitude = 0; 
let maxAltitude = 40000;
let minBearing = 0;
let maxBearing = 360;
let updateInterval = 10000; // default 10s
let hideGround = false;
let currentTheme = 'system';
let refreshTimerId = null;
let timer = 10;
let selectedIcao = null;

const STYLES = {
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
};

// DOM Elements
const flightListContainer = document.getElementById('flight-list');
const radiusSelect = document.getElementById('radius-select');
const minAltInput = document.getElementById('min-alt');
const maxAltInput = document.getElementById('max-alt');
const altValuesEl = document.getElementById('alt-values');
const minBearingInput = document.getElementById('min-bearing');
const maxBearingInput = document.getElementById('max-bearing');
const bearingValuesEl = document.getElementById('bearing-values');
const hideGroundInput = document.getElementById('hide-ground');
const positionBtn = document.getElementById('position-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const themeBtns = document.querySelectorAll('.theme-btn');
const refreshRateSelect = document.getElementById('refresh-rate');
const updateTimerEl = document.getElementById('update-timer');
const flightCountEl = document.getElementById('flight-count');
const locationPrompt = document.getElementById('location-prompt');
const retryLocationBtn = document.getElementById('retry-location');

/**
 * Initialize the application.
 */
async function init() {
    loadSettings();
    applyTheme();
    setupMap();
    setupEventListeners();
    requestLocation();
    
    // Listen for system theme changes if in system mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme === 'system') applyTheme();
    });
}

/**
 * Load settings from localStorage.
 */
function loadSettings() {
    const saved = localStorage.getItem('lookup_settings');
    if (saved) {
        const settings = JSON.parse(saved);
        currentRadius = settings.radius || 20;
        minAltitude = settings.minAlt ?? 0;
        maxAltitude = settings.maxAlt ?? 40000;
        minBearing = settings.minBearing ?? 0;
        maxBearing = settings.maxBearing ?? 360;
        updateInterval = settings.interval ?? 10000;
        hideGround = settings.hideGround || false;
        currentTheme = settings.theme || 'system';
        manualMode = settings.manualMode || false;
        if (manualMode && settings.manualCoords) {
            userLocation = settings.manualCoords;
        }
        
        // Update UI elements
        radiusSelect.value = currentRadius;
        minAltInput.value = minAltitude;
        maxAltInput.value = maxAltitude;
        minBearingInput.value = minBearing;
        maxBearingInput.value = maxBearing;
        refreshRateSelect.value = updateInterval;
        hideGroundInput.checked = hideGround;
        if (positionBtn) positionBtn.classList.toggle('active', manualMode);
        
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        });
        
        updateAltLabels();
        updateBearingLabels();
    }
}

/**
 * Save settings to localStorage.
 */
function saveSettings() {
    const settings = {
        radius: currentRadius,
        minAlt: minAltitude,
        maxAlt: maxAltitude,
        minBearing,
        maxBearing,
        interval: updateInterval,
        hideGround,
        theme: currentTheme,
        manualMode,
        manualCoords: manualMode ? userLocation : null
    };
    localStorage.setItem('lookup_settings', JSON.stringify(settings));
}

/**
 * Apply the current theme.
 */
function applyTheme() {
    const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    
    if (map) {
        map.setStyle(isDark ? STYLES.dark : STYLES.light);
    }
}

/**
 * Setup MapLibre Map.
 */
function setupMap() {
    const isDark = document.documentElement.classList.contains('dark');
    map = new maplibregl.Map({
        container: 'map',
        style: isDark ? STYLES.dark : STYLES.light,
        center: [0, 0],
        zoom: 2
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', () => {
        initArcLayer();
        updateArcOnMap();
    });

    map.on('click', (e) => {
        if (manualMode) {
            userLocation = { lat: e.lngLat.lat, lon: e.lngLat.lng };
            updateUserMarker();
            updateArcOnMap();
            saveSettings();
            updateData();
        }
    });
}

/**
 * Initialize the Visibility Arc layers.
 */
function initArcLayer() {
    map.addSource('visibility-arc', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
        id: 'visibility-arc-fill',
        type: 'fill',
        source: 'visibility-arc',
        paint: {
            'fill-color': '#0ea5e9',
            'fill-opacity': 0.15
        }
    });

    map.addLayer({
        id: 'visibility-arc-outline',
        type: 'line',
        source: 'visibility-arc',
        paint: {
            'line-color': '#0ea5e9',
            'line-width': 2,
            'line-dasharray': [2, 2]
        }
    });
}

/**
 * Update the visibility arc GeoJSON on the map.
 */
function updateArcOnMap() {
    if (!map || !map.getSource('visibility-arc') || !userLocation) return;

    // Auto-show arc if range is not 360
    const bearingDiff = Math.abs(maxBearing - minBearing);
    const isFullCircle = bearingDiff >= 360 || bearingDiff === 0;

    if (isFullCircle) {
        map.getSource('visibility-arc').setData({ type: 'FeatureCollection', features: [] });
        return;
    }

    const arc = createVisibilityArc(userLocation, currentRadius, minBearing, maxBearing);
    if (arc) {
        map.getSource('visibility-arc').setData(arc);
    }
}

/**
 * Setup Event Listeners.
 */
function setupEventListeners() {
    radiusSelect.addEventListener('change', (e) => {
        currentRadius = parseInt(e.target.value);
        saveSettings();
        updateArcOnMap();
        updateData();
    });

    [minAltInput, maxAltInput].forEach(input => {
        input.addEventListener('input', () => {
            minAltitude = parseInt(minAltInput.value);
            maxAltitude = parseInt(maxAltInput.value);
            if (minAltitude > maxAltitude) {
                if (input === minAltInput) maxAltInput.value = minAltitude;
                else minAltInput.value = maxAltitude;
                minAltitude = parseInt(minAltInput.value);
                maxAltitude = parseInt(maxAltInput.value);
            }
            updateAltLabels();
            saveSettings();
            updateData(true); 
        });
    });

    [minBearingInput, maxBearingInput].forEach(input => {
        input.addEventListener('input', () => {
            minBearing = parseInt(minBearingInput.value);
            maxBearing = parseInt(maxBearingInput.value);
            updateBearingLabels();
            updateArcOnMap();
            saveSettings();
            updateData(true);
        });
    });

    hideGroundInput.addEventListener('change', (e) => {
        hideGround = e.target.checked;
        saveSettings();
        updateData(true);
    });

    // Manual Position Toggle
    positionBtn?.addEventListener('click', () => {
        manualMode = !manualMode;
        positionBtn.classList.toggle('active', manualMode);
        document.getElementById('map').classList.toggle('map-manual-mode', manualMode);
        
        if (!manualMode && actualLocation) {
            // Revert to actual GPS
            userLocation = actualLocation;
            updateUserMarker();
            updateArcOnMap();
            updateData();
        }
        saveSettings();
    });

    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => settingsModal.classList.add('hidden'));

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTheme = btn.dataset.theme;
            themeBtns.forEach(b => b.classList.toggle('active', b === btn));
            applyTheme();
            saveSettings();
        });
    });

    refreshRateSelect.addEventListener('change', (e) => {
        updateInterval = parseInt(e.target.value);
        saveSettings();
        
        if (updateInterval === 0) {
            updateTimerEl.textContent = `Refresh Paused`;
            if (refreshTimerId) clearInterval(refreshTimerId);
        } else {
            timer = updateInterval / 1000;
            startDataLoop(true); 
        }
    });

    retryLocationBtn.addEventListener('click', () => {
        requestLocation();
    });

    document.getElementById('force-refresh')?.addEventListener('click', () => {
        // Immediate UI feedback
        const btn = document.getElementById('force-refresh');
        btn.classList.add('spinning');
        setTimeout(() => btn.classList.remove('spinning'), 500);

        updateData();
        
        // Reset timer to full interval if not paused
        if (updateInterval !== 0) {
            timer = updateInterval / 1000;
            updateTimerEl.textContent = `Refreshing in ${timer}s`;
        }
    });
}

function updateAltLabels() {
    const formatAlt = (alt) => {
        if (alt >= 18000) return `FL${Math.round(alt/100)}`;
        return alt.toString();
    };
    altValuesEl.textContent = `${formatAlt(minAltitude)} - ${formatAlt(maxAltitude)}`;
}

function updateBearingLabels() {
    bearingValuesEl.textContent = `${minBearing}° - ${maxBearing}°`;
}

/**
 * Request User Geolocation.
 */
function requestLocation() {
    if ("geolocation" in navigator) {
        locationPrompt.classList.add('hidden');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                actualLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                if (!manualMode) {
                    userLocation = actualLocation;
                }
                
                map.setCenter([userLocation.lon, userLocation.lat]);
                map.setZoom(10);
                
                updateUserMarker();
                updateArcOnMap();

                if (updateInterval !== 0) {
                    startDataLoop();
                } else {
                    updateData();
                    updateTimerEl.textContent = `Refresh Paused`;
                }
            },
            (error) => {
                console.error("Location error:", error);
                locationPrompt.classList.remove('hidden');
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function updateUserMarker() {
    if (userMarker) userMarker.remove();
    userMarker = new maplibregl.Marker({ color: "#f97316" })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
}

/**
 * Data Refresh Loop.
 */
function startDataLoop(reset = false) {
    if (refreshTimerId) {
        clearInterval(refreshTimerId);
    }
    
    if (updateInterval === 0) return;

    if (!reset) {
        updateData();
        timer = updateInterval / 1000;
    }
    
    refreshTimerId = setInterval(() => {
        if (timer > 0) {
            timer--;
        }
        
        if (timer <= 0) {
            updateData();
            timer = updateInterval / 1000;
        }
        updateTimerEl.textContent = `Refreshing in ${timer}s`;
    }, 1000);
}

/**
 * Fetch and Render Aircraft.
 */
let lastFetchedFlights = [];
async function updateData(isLocalOnly = false) {
    if (!userLocation) return;

    if (!isLocalOnly) {
        const rawAircraft = await fetchNearbyAircraft(userLocation.lat, userLocation.lon, currentRadius);
        lastFetchedFlights = (rawAircraft || []).map(ac => processFlightData(ac, userLocation.lat, userLocation.lon));
    }
    
    // Filter by altitude, ground traffic, and bearing
    const filteredFlights = lastFetchedFlights.filter(f => {
        const alt = f.altitude;
        const bearing = calculateBearing(userLocation.lat, userLocation.lon, f.lat, f.lon);
        
        if (hideGround && alt <= 0) return false;
        if (!isWithinArc(bearing, minBearing, maxBearing)) return false;
        return alt >= minAltitude && alt <= maxAltitude;
    });

    // Sort by distance
    filteredFlights.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lon, a.lat, a.lon);
        const distB = calculateDistance(userLocation.lat, userLocation.lon, b.lat, b.lon);
        return distA - distB;
    });

    renderList(filteredFlights);
    renderMarkers(filteredFlights);
    
    flightCountEl.textContent = `${filteredFlights.length} Flights`;
}

/**
 * Render Flight List Sidebar.
 */
function renderList(flights) {
    flightListContainer.innerHTML = '';
    
    if (flights.length === 0) {
        flightListContainer.innerHTML = `
            <div class="list-placeholder">
                <p>No planes found in range.</p>
            </div>
        `;
        return;
    }

    flights.forEach(flight => {
        const card = createFlightCard(flight, userLocation.lat, userLocation.lon);
        if (selectedIcao === flight.icao) card.classList.add('active-selection');
        
        card.addEventListener('click', () => {
            selectFlight(flight.icao, [flight.lon, flight.lat]);
        });

        flightListContainer.appendChild(card);
    });
}

function selectFlight(icao, coords) {
    selectedIcao = icao;
    // Map move
    map.flyTo({
        center: coords,
        zoom: 12,
        essential: true
    });
    
    // UI Update
    document.querySelectorAll('.flight-card').forEach(c => {
        c.classList.toggle('active-selection', c.dataset.icao === icao);
        if (c.dataset.icao === icao) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

/**
 * Render Markers on Map.
 */
function renderMarkers(flights) {
    // Clear old markers
    const flightIcaos = flights.map(f => f.icao);
    Object.keys(markers).forEach(icao => {
        if (!flightIcaos.includes(icao)) {
            markers[icao].remove();
            delete markers[icao];
        }
    });

    flights.forEach(flight => {
        if (markers[flight.icao]) {
            // Update existing marker
            markers[flight.icao].setLngLat([flight.lon, flight.lat]);
            
            const el = markers[flight.icao].getElement();
            el.innerHTML = `
                ${getPlaneIcon(flight.heading, flight.isGA)}
                <div class="marker-label">${flight.callsign}</div>
            `;
        } else {
            // Create new marker DOM element
            const el = document.createElement('div');
            el.className = 'plane-marker';
            el.innerHTML = `
                ${getPlaneIcon(flight.heading, flight.isGA)}
                <div class="marker-label">${flight.callsign}</div>
            `;
            
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([flight.lon, flight.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 })
                    .setHTML(`<strong>${flight.callsign}</strong><br>${flight.airline}<br>${flight.type}<br>${flight.altitude} ft`))
                .addTo(map);
            
            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                selectFlight(flight.icao, [flight.lon, flight.lat]);
            });
            
            markers[flight.icao] = marker;
        }
    });
}

init();
