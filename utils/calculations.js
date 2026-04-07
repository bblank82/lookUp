import * as turf from '@turf/turf';

/**
 * Calculates the Haversine distance between two points in Nautical Miles.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    const options = { units: 'nauticalmiles' };
    return turf.distance(from, to, options).toFixed(1);
}

/**
 * Calculates the initial bearing from point A to point B.
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    const bearing = turf.bearing(from, to);
    return Math.round(normalizeAngle(bearing));
}

/**
 * Converts a degree bearing to a compass direction string.
 */
export function getCompassDirection(bearing) {
    // Normalize bearing to 0-360
    const normalized = (bearing + 360) % 360;
    const directions = [
        { label: 'North', range: [337.5, 22.5] },
        { label: 'North-East', range: [22.5, 67.5] },
        { label: 'East', range: [67.5, 112.5] },
        { label: 'South-East', range: [112.5, 157.5] },
        { label: 'South', range: [157.5, 202.5] },
        { label: 'South-West', range: [202.5, 247.5] },
        { label: 'West', range: [247.5, 292.5] },
        { label: 'North-West', range: [292.5, 337.5] }
    ];

    for (const dir of directions) {
        if (dir.label === 'North') {
            if (normalized >= dir.range[0] || normalized < dir.range[1]) return dir.label;
        } else {
            if (normalized >= dir.range[0] && normalized < dir.range[1]) return dir.label;
        }
    }
    return '';
}

/**
 * Formats a distance and bearing into a human-readable "Spotter String".
 * Example: "6 NM, North-East (55°)"
 */
export function formatSpotterString(distance, bearing) {
    const direction = getCompassDirection(bearing);
    return `${distance} NM, ${direction} (${bearing}°)`;
}

/**
 * Normalizes an angle into the 0-360 range.
 */
export function normalizeAngle(angle) {
    return (angle + 360) % 360;
}

/**
 * Creates a GeoJSON sector representing a visibility arc.
 */
export function createVisibilityArc(center, radiusNM, startBearing, endBearing) {
    const centerPoint = [center.lon, center.lat];
    const radiusKM = radiusNM * 1.852; // Convert NM to KM for turf
    
    // Ensure bearings are 0-360
    const b1 = normalizeAngle(startBearing);
    const b2 = normalizeAngle(endBearing);

    try {
        // If the range is full circle, return a circle
        if (Math.abs(normalizeAngle(b2 - b1)) >= 359.9) {
            return turf.circle(centerPoint, radiusKM, { units: 'kilometers' });
        }
        return turf.sector(centerPoint, radiusKM, b1, b2, { units: 'kilometers' });
    } catch (e) {
        console.error("Turf sector error:", e);
        return null;
    }
}

/**
 * Checks if a bearing is within a min/max range, including across 0°.
 */
export function isWithinArc(bearing, min, max) {
    const b = normalizeAngle(bearing);
    const nMin = normalizeAngle(min);
    const nMax = normalizeAngle(max);

    if (nMin <= nMax) {
        return b >= nMin && b <= nMax;
    } else {
        // Range crosses 360/0
        return b >= nMin || b <= nMax;
    }
}
