import credentials from '../credentials.json';
import airportsDb from './airports.json';

const TOKEN_URL = '/opensky-token';
const API_BASE  = '/opensky-api';

let _token = null;
let _tokenExpiresAt = 0;

// Cache of callsign -> flight info, populated by airport departure lookup
let _flightCache = {};
let _cacheFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // refresh every 5 minutes

async function getToken() {
    if (_token && Date.now() < _tokenExpiresAt) return _token;

    const body = new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     credentials.clientId,
        client_secret: credentials.clientSecret,
    });

    const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!resp.ok) throw new Error(`OpenSky auth failed: ${resp.status}`);

    const data = await resp.json();
    _token = data.access_token;
    _tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return _token;
}

/**
 * Find the nearest large airport (with IATA code) to a lat/lon.
 */
function findNearestAirport(lat, lon) {
    let best = null;
    let bestDist = Infinity;

    for (const [icao, ap] of Object.entries(airportsDb)) {
        if (!ap.iata) continue; // skip airports without IATA codes (small/private)
        const dlat = ap.lat - lat;
        const dlon = ap.lon - lon;
        const dist = dlat * dlat + dlon * dlon; // squared distance is fine for comparison
        if (dist < bestDist) {
            bestDist = dist;
            best = { icao, ...ap };
        }
    }
    return best;
}

/**
 * Pre-fetch all departures + arrivals from the nearest airport and cache by callsign.
 * Called once when the user's location is known, then refreshed every 5 minutes.
 */
export async function prefetchAirportFlights(userLat, userLon) {
    const now = Date.now();
    if (now - _cacheFetchedAt < CACHE_TTL_MS) return; // still fresh

    const airport = findNearestAirport(userLat, userLon);
    if (!airport) return;

    try {
        const token = await getToken();
        const nowSec   = Math.floor(now / 1000);
        const beginSec = nowSec - 7200; // last 2 hours

        const [depResp, arrResp] = await Promise.all([
            fetch(`${API_BASE}/flights/departure?airport=${airport.icao}&begin=${beginSec}&end=${nowSec}`,
                { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/flights/arrival?airport=${airport.icao}&begin=${beginSec}&end=${nowSec}`,
                { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const newCache = {};

        if (depResp.ok) {
            const deps = await depResp.json();
            for (const f of (deps || [])) {
                const cs = (f.callsign || '').trim();
                if (cs) newCache[cs] = { departure: f.estDepartureAirport, arrival: f.estArrivalAirport };
            }
        }

        if (arrResp.ok) {
            const arrs = await arrResp.json();
            for (const f of (arrs || [])) {
                const cs = (f.callsign || '').trim();
                if (cs && !newCache[cs]) {
                    newCache[cs] = { departure: f.estDepartureAirport, arrival: f.estArrivalAirport };
                }
            }
        }

        _flightCache = newCache;
        _cacheFetchedAt = now;
        console.log(`[OpenSky] Cached ${Object.keys(newCache).length} flights near ${airport.iata} (${airport.icao})`);
    } catch (err) {
        console.warn('[OpenSky] Airport prefetch failed:', err.message);
    }
}

/**
 * Get flight route info for a flight by callsign.
 * First tries the airport cache, then falls back to per-aircraft ICAO24 lookup.
 */
export async function getFlightInfo(callsign, icao24) {
    const cs = (callsign || '').trim();

    // 1. Try cache (airport departures/arrivals)
    if (cs && _flightCache[cs]) {
        return _flightCache[cs];
    }

    // 2. Fallback: per-aircraft ICAO24 lookup
    if (!icao24) return null;

    try {
        const token = await getToken();
        const now   = Math.floor(Date.now() / 1000);
        const begin = now - 172800; // 48h max

        const resp = await fetch(
            `${API_BASE}/flights/aircraft?icao24=${icao24.toLowerCase()}&begin=${begin}&end=${now}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!resp.ok) return null;

        const flights = await resp.json();
        if (!flights || flights.length === 0) return null;

        const best = [...flights].reverse().find(f => f.estDepartureAirport) || flights[flights.length - 1];
        const result = { departure: best.estDepartureAirport || null, arrival: best.estArrivalAirport || null };

        // Populate cache for future lookups
        if (cs) _flightCache[cs] = result;
        return result;
    } catch (err) {
        console.warn('[OpenSky] Flight lookup failed:', err.message);
        return null;
    }
}
