const RAPIDAPI_KEY = 'cdfa13bac2mshe9fedbfa664d624p1e89d7jsn75b95d62fae6';
const RAPIDAPI_HOST = 'adsbexchange-com1.p.rapidapi.com';

/**
 * Fetch aircraft within a certain radius of a latitude/longitude.
 * Units for distance is Nautical Miles (NM).
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
    return {
        icao: ac.hex,
        callsign: rawCallsign,
        flightNumber: rawCallsign,
        airline: getAirlineFromCallsign(rawCallsign),
        type: ac.t || 'Unknown Aircraft',
        registration: ac.r || 'N/A',
        altitude: ac.alt_baro === 'ground' ? 0 : (ac.alt_baro || ac.alt_geom || 0), // ft
        speed: ac.gs || 0, // knots
        heading: ac.track || 0, // degrees
        lat: ac.lat,
        lon: ac.lon,
        squawk: ac.squawk || '7000',
        military: ac.mil === 1,
        emergency: ac.alert === 1,
        category: ac.category || 'A0'
    };
}

function getAirlineFromCallsign(callsign) {
    if (!callsign) return 'General Aviation';
    const icao = callsign.substring(0, 3).toUpperCase();
    const airlines = {
        'AAL': 'American Airlines',
        'UAL': 'United Airlines',
        'DAL': 'Delta Air Lines',
        'SWA': 'Southwest Airlines',
        'JBU': 'JetBlue Airways',
        'BAW': 'British Airways',
        'DLH': 'Lufthansa',
        'AFR': 'Air France',
        'KLM': 'KLM Royal Dutch Airlines',
        'FDX': 'FedEx Express',
        'UPS': 'UPS Airlines',
        'FFT': 'Frontier Airlines',
        'NKS': 'Spirit Airlines',
        'VOO': 'Trans States Airlines',
        'ASH': 'Mesa Airlines',
        'RPA': 'Republic Airways',
        'SKW': 'SkyWest Airlines',
        'ASA': 'Alaska Airlines',
        'HAL': 'Hawaiian Airlines',
        'WJA': 'WestJet',
        'ACA': 'Air Canada',
        'EJA': 'NetJets',
        'LXJ': 'Flexjet',
        'EDV': 'Endeavor Air',
        'ENY': 'Envoy Air',
        'PDT': 'Piedmont Airlines',
        'PSA': 'PSA Airlines',
        'QXE': 'Horizon Air',
        'LRC': 'Avianca',
        'AMX': 'Aeromexico',
        'GJS': 'GoJet Airlines',
        'CPZ': 'Compass Airlines'
    };
    return airlines[icao] || 'General Aviation';
}

