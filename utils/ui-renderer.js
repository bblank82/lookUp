import { calculateDistance, calculateBearing, formatSpotterString, normalizeAngle } from './calculations.js';

/**
 * Renders a flight card for the sidebar.
 */
/**
 * Renders a flight card for the sidebar.
 */
export function createFlightCard(flight, userLat, userLon) {
    const distance = calculateDistance(userLat, userLon, flight.lat, flight.lon);
    const bearing = calculateBearing(userLat, userLon, flight.lat, flight.lon);
    const spotterInfo = formatSpotterString(distance, bearing);
    
    // Progress: 100% when distance is 0, 0% when distance is 20 (max radius)
    const maxRadius = 20; 
    const progress = Math.max(0, Math.min(100, ((maxRadius - distance) / maxRadius) * 100));

    // Logo logic (Aviasales img.wway.io)
    const logoUrl = flight.iata 
        ? `https://img.wway.io/pics/root/${flight.iata.toUpperCase()}@png?exar=1&rs=fit:200:200`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(flight.airline)}&background=0ea5e9&color=fff`;

    const card = document.createElement('div');
    card.className = 'flight-card animate-in';
    card.dataset.icao = flight.icao;
    
    card.innerHTML = `
        <div class="card-header">
            <div class="airline-logo-container">
                <img src="${logoUrl}" alt="" class="airline-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(flight.airline)}&background=0ea5e9&color=fff'">
            </div>
            <div class="flight-info">
                <div class="flight-number">${flight.callsign}</div>
                <div class="airline-name">${flight.airline}</div>
                <span class="flight-id">${flight.registration} • ${flight.type}</span>
            </div>
            <span class="card-badge">${flight.icao.toUpperCase()}</span>
        </div>
        
        <div class="card-route">
            <div class="route-point">ORGN</div>
            <div class="route-line">
                <div class="route-plane">✈</div>
            </div>
            <div class="route-point">DEST</div>
        </div>

        <div class="card-details">
            <div class="detail-item">
                <span>Speed</span>
                <strong>${flight.speed} kts</strong>
            </div>
            <div class="detail-item">
                <span>Altitude</span>
                <strong>${flight.altitude > 0 ? flight.altitude + ' ft' : 'GROUND'}</strong>
            </div>
        </div>

        <div class="spotter-aid">
            <div class="relative-pos">
                ${spotterInfo}
            </div>
            <div class="compass-arrow" style="transform: rotate(${bearing}deg)">
                ↑
            </div>
        </div>
    `;

    return card;
}

/**
 * Returns plane icons for the map based on whether it is GA or Commercial.
 */
export function getPlaneIcon(heading, isGA = false, isTwin = false) {
    const color = isGA ? '#f97316' : '#0ea5e9'; // Orange for GA, Blue for Commercial
    
    if (isGA) {
        if (isTwin) {
            // Twin Propeller SVG
            return `
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transition: transform 0.3s">
                    <path d="M12 2L14 6V20L12 18L10 20V6L12 2ZM2 10H8V12H2V10ZM16 10H22V12H16L16 10ZM5 8H8V15H5V8ZM16 8H19V15H16V8Z" fill="${color}" stroke="white" stroke-width="1.5"/>
                </svg>
            `;
        }
        // Classic High-Wing Propeller Plane SVG (GA)
        return `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transition: transform 0.3s">
                <path d="M12 2L13 8H22V10H13L12.5 19H17V21H7V19H11.5L11 8H2V10H11L12 2Z" fill="${color}" stroke="white" stroke-width="1.5"/>
            </svg>
        `;
    }

    // Commercial Jet SVG
    return `
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transition: transform 0.3s">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" stroke="white" stroke-width="1.5"/>
        </svg>
    `;
}
