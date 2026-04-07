# lookUP! | Aviation Spotter Buddy

## Project Overview
**lookUP!** is a high-fidelity, real-time aviation tracking application specifically designed for physical plane spotters. It provides localized ADS-B data with an emphasis on visibility filters, spatial awareness, and rich flight identity data.

## Key Features

### 1. Spatial Filtering
- **Radius**: Restrict tracking to a specific distance (5, 10, 20, 50, 100 NM).
- **Altitude Range**: Filter by altitude (FT) or Flight Level (FL180+).
- **Visibility Arc**: Filter by absolute bearing (0-359°). Allows spotters to ignore planes blocked by terrain or buildings.
- **Ground Traffic**: Toggle to hide aircraft at 0 FT.

### 2. Visualization
- **Map Overlay**: Uses MapLibre GL with CartoDB styles (light & dark themes).
- **Dynamic Arc**: A shaded sector on the map visualizes the active bearing and radius filter.
- **Markers**: Rotating plane icons — Classic high-wing silhouette for GA, jet silhouette for commercial.
  - GA aircraft use an orange icon; commercial use blue.
  - Twin/multi-engine GA aircraft use a distinct twin-engine silhouette icon.
- **Callsign Labels**: Each map marker shows the flight/tail number below the icon.
- **Live Flight Trail**: When a flight is selected, a dashed blue line draws the breadcrumb trail of its path during the current session. Cleared on reload — no `localStorage` pollution.

### 3. Airline & Aircraft Type Data (Local — OpenFlights)
- `utils/airlines.json`: 5,852 airlines mapped by ICAO 3-letter code → name + IATA code.
- `utils/planes.json`: 445 aircraft types mapped by IATA/ICAO type code → friendly name (e.g. `B738` → `Boeing 737-800`).
- `utils/airports.json`: 7,697 airports mapped by ICAO code → IATA code, name, city, lat, lon. Used for dep/arr display and nearest-airport detection.

### 4. Airline Logos (Local)
- 993 airline logos stored in `public/logos/{ICAO}.png`, sourced from the `sexym0nk3y/airline-logos` GitHub repo.
- Logo URL pattern: `/logos/{3-letter ICAO callsign prefix}.png` (e.g. `DAL.png`, `SKW.png`).
- Falls back to a ui-avatars.com initials badge on `onerror`.

### 5. Origin & Destination Lookup (OpenSky Network)
- On GPS location detect, `prefetchAirportFlights(lat, lon)` is called automatically:
  - Finds the nearest airport with an IATA code from `airports.json`.
  - Fetches 2h of departures and arrivals from that airport via OpenSky REST API.
  - Caches results by callsign (refreshes every 5 minutes).
- On flight card click → `enrichCardWithRoute(card, callsign, icao24)`:
  1. Instant callsign lookup in the airport cache (high coverage near major airports).
  2. Falls back to per-aircraft ICAO24 `/flights/aircraft` lookup (48h window).
  3. Uses `airports.json` to resolve ICAO airport codes → IATA codes + full name (tooltip).
- **Rate limits**: 48h per-aircraft endpoint requires authenticated requests; airport endpoints have a 1 UTC-day constraint.
- **Coverage note**: OpenSky is crowd-sourced ADS-B. Some flights won't have dep/arr data.

### 6. OpenSky Authentication (Vite Dev Proxy)
- `credentials.json` (gitignore before public deployment) stores `clientId` + `clientSecret`.
- OpenSky uses OAuth2 client-credentials flow — CORS blocks browser-direct calls.
- `vite.config.js` configures two server-side proxy routes:
  - `/opensky-token` → `https://auth.opensky-network.org/.../token`
  - `/opensky-api` → `https://opensky-network.org/api`
- **Production**: Must be replaced with an Amplify Function (Lambda) — see `todo.md`.

### 7. Location Modes
- **GPS Mode**: Automatically detects user position via browser geolocation.
- **Manual Mode**: A crosshair toggle allows users to click anywhere on the map to set a custom "spotter point," repositioning the search center and recalculating all distances/bearings.

### 8. Configuration & State
- **Settings Modal**: Centralized hub for Theme (Light/Dark/System) and Refresh Rate (5s to 60s, or Pause).
- **Force Refresh**: Manual refresh button in the footer with spin animation; resets the countdown timer.
- **Persistence**: All user settings, including manual position and filters, are saved to `localStorage`.

### 9. Mobile Prototype (Sandboxed)
- **`mobile.html` + `mobile.css`**: A parallel entry point with a "Bottom-Sheet" UI pattern.
  - The sidebar transforms into a swipeable bottom sheet.
  - Selecting a flight auto-collapses the sheet so the map is visible.
  - Arc filter is moved into Settings to keep the collapsed header compact.
- **Auto-Redirect**: `index.html` detects mobile browsers (UA string + viewport ≤768px) and redirects to `mobile.html` automatically.
- **Vite entry**: Both `index.html` and `mobile.html` are registered as build entry points in `vite.config.js`.

## Data Sources
| Source | Use | Notes |
|---|---|---|
| ADSBexchange (RapidAPI) | Live aircraft positions, type, registration | Key hardcoded in `utils/api.js` — move to env before deploy |
| OpenSky Network | Origin/destination airport lookup | OAuth2 credentials in `credentials.json` |
| OpenFlights (local JSON) | Airline names, aircraft friendly names, airport codes | Fully offline |
| sexym0nk3y/airline-logos | Airline logo PNGs | Local copy in `public/logos/` (993 files) |
| MapLibre GL + CartoDB | Map rendering | Light & dark tile styles |

## API Comparison: OpenSky vs ADSBexchange for Live Tracking
OpenSky `states/all` was evaluated as a potential replacement for ADSBexchange and **deemed unsuitable** for the primary tracking role:
- **Missing**: Registration (tail number) and aircraft type code — both displayed on every flight card and used for GA/commercial icon detection.
- **Advantage**: Free, no rate-cost; provides `vertical_rate` and aircraft category integer.
- **Conclusion**: Keep ADSBexchange for live position data; use OpenSky only for dep/arr enrichment (complementary roles).

## File Structure
- `index.html` — Desktop layout and UI structure.
- `mobile.html` — Mobile prototype layout (sandboxed — does NOT affect desktop).
- `style.css` — Custom glassmorphic styling for desktop.
- `mobile.css` — Mobile-specific overrides (bottom-sheet, safe area insets).
- `main.js` — Core logic, state management, map handling, live trail system, dep/arr enrichment.
- `vite.config.js` — Vite build config + OpenSky CORS proxy routes.
- `credentials.json` — OpenSky OAuth2 credentials (**do not commit to public repo**).
- `utils/api.js` — ADSBexchange integration and data normalization.
- `utils/opensky.js` — OpenSky client: OAuth2 token management, airport prefetch, callsign cache, ICAO24 fallback.
- `utils/calculations.js` — Geospatial math (distance, bearing, arc generation, `isWithinArc`).
- `utils/ui-renderer.js` — Flight card and map marker icon generation.
- `utils/airlines.json` — Local OpenFlights airline database.
- `utils/planes.json` — Local OpenFlights aircraft type database.
- `utils/airports.json` — Local OpenFlights airport database (with lat/lon).
- `public/logos/` — 993 airline logo PNGs keyed by ICAO 3-letter code.
- `todo.md` — Backlog and Amplify production migration checklist.

## Known Issues / Future Work
- **API Key**: RapidAPI key is hardcoded in `utils/api.js`. Migrate to Amplify env var before public deploy.
- **OpenSky CORS**: Dev proxy only works locally. Amplify deployment requires an Amplify Function (Lambda) to proxy token exchange and API calls server-side. See `todo.md` for migration plan.
- **Dep/Arr Coverage**: OpenSky is crowd-sourced — coverage gaps mean some flights show N/A. Airport-based pre-fetch significantly improves hit rate near major airports.
- **Flight Trail**: Session-only — records from page load forward, no historical path.
- **Mobile Polish**: Bottom sheet swipe gestures are tap-only; full gesture support not yet implemented.
