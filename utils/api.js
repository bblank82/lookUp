import airlinesDb from './airlines.json';
import planesDb from './planes.json';

const RAPIDAPI_KEY = 'cdfa13bac2mshe9fedbfa664d624p1e89d7jsn75b95d62fae6';
const RAPIDAPI_HOST = 'adsbexchange-com1.p.rapidapi.com';

/**
 * Fetch aircraft within a certain radius of a latitude/longitude.
 */
export async function fetchNearbyAircraft(lat, lon, distNM) {
    const url = `https://${RAPIDAPI_HOST}/v2/lat/${lat}/lon/${lon}/dist/${distNM}/`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.ac || [];
    } catch (error) {
        console.error('Failed to fetch aircraft details:', error);
        return [];
    }
}

/**
 * Formats a flight's data for the UI.
 */
export function processFlightData(ac, userLat, userLon) {
    const rawCallsign = (ac.flight || ac.call || 'Unknown').trim();
    const icaoCode = rawCallsign.substring(0, 3).toUpperCase();
    const airlineEntry = airlinesDb[icaoCode];
    const airline = airlineEntry ? airlineEntry.name : 'General Aviation';
    const iata = airlineEntry ? airlineEntry.iata : null;

    const rawType = ac.t || '';
    const friendlyType = planesDb[rawType] || rawType || 'Unknown Aircraft';

    return {
        icao: ac.hex,
        iata,
        callsign: rawCallsign,
        airline,
        isGA: isGeneralAviation(rawCallsign, airline),
        isTwin: friendlyType.toLowerCase().includes('twin') || friendlyType.toLowerCase().includes('multi'),
        type: friendlyType,
        registration: ac.r || 'N/A',
        altitude: ac.alt_baro === 'ground' ? 0 : (ac.alt_baro || ac.alt_geom || 0),
        speed: ac.gs || 0,
        heading: ac.track || 0,
        lat: ac.lat,
        lon: ac.lon,
        squawk: ac.squawk || '7000',
        military: ac.mil === 1,
        emergency: ac.alert === 1,
        category: ac.category || 'A0'
    };
}

/**
 * Determine if a callsign is likely a General Aviation tail number.
 */
export function isGeneralAviation(callsign, airlineName) {
    if (!callsign || callsign === 'Unknown') return true;
    if (airlineName === 'General Aviation') return true;
    
    // US Tail Number pattern: N + 1-5 digits/letters
    const nNumberPattern = /^N[0-9]{1,5}[A-Z]{0,2}$/i;
    if (nNumberPattern.test(callsign)) return true;
    
    return false;
}
