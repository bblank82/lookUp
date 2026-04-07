import { calculateDistance, calculateBearing, formatSpotterString, normalizeAngle } from './calculations.js';

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

    const card = document.createElement('div');
    card.className = 'flight-card animate-in';
    card.dataset.icao = flight.icao;
    
    card.innerHTML = `
        <div class="card-header">
            <div class="airline-info">
                <h3>${flight.callsign} <span class="airline-name-sub">| ${flight.airline}</span></h3>
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

        <div class="progress-status">APPROACHING SPOTTER</div>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
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
            <div class="detail-item">
                <span>Distance</span>
                <strong>${distance} NM</strong>
            </div>
            <div class="detail-item">
                <span>Squawk</span>
                <strong>${flight.squawk}</strong>
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
 * Returns plane icons for the map based on the category of aircraft.
 */
export function getPlaneIcon(heading) {
    // Return an SVG element that can be rotated.
    const svg = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg)">
            <path d="M17.8 19.2L16 11L19.5 8.5C19.7 8.3 19.8 8.1 19.8 7.9C19.8 7.5 19.5 7.1 19.1 7.1C19 7.1 18.9 7.1 18.8 7.2L15 8.7L11.1 2.2C10.8 1.7 10.3 1.5 9.8 1.5C9.2 1.5 8.7 2 8.7 2.6C8.7 2.7 8.7 2.8 8.8 2.9L11.4 8.7L6.4 10.7L4.4 7.8C4.1 7.4 3.7 7.2 3.3 7.2C2.7 7.2 2.2 7.7 2.2 8.3C2.2 8.4 2.2 8.5 2.3 8.6L3.1 12.1L2.3 15.6C2.2 15.7 2.2 15.8 2.2 15.9C2.2 16.5 2.7 17 3.3 17C3.7 17 4.1 16.8 4.4 16.4L6.4 13.5L11.4 15.5L8.8 21.3C8.7 21.4 8.7 21.5 8.7 21.6C8.7 22.2 9.2 22.7 9.8 22.7C10.3 22.7 10.8 22.5 11.1 22L15 15.5L18.8 17C18.9 17.1 19 17.1 19.1 17.1C19.5 17.1 19.8 16.8 19.8 16.4C19.8 16.2 19.7 16 19.5 15.8L16 13.3L17.8 5.1" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    return svg;
}
