# lookUP! | Aviation Spotter Buddy

## Project Overview
**lookUP!** is a high-fidelity, real-time aviation tracking application specifically designed for physical plane spotters. It provides localized ADS-B data with an emphasis on visibility filters and spatial awareness.

## Key Features

### 1. Spatial Filtering
- **Radius**: Restrict tracking to a specific distance (5, 10, 20, 50, 100 NM).
- **Altitude Range**: Filter by altitude (FT) or Flight Level (FL180+). 
- **Visibility Arc**: Filter by absolute bearing (0-359°). This allows spotters to ignore planes blocked by terrain or buildings.
- **Ground Traffic**: Toggle to hide aircraft at 0 FT.

### 2. Visualization
- **Map Overlay**: Uses MapLibre GL with CartoDB styles.
- **Dynamic Arc**: A shaded sector on the map visualizes the active bearing and radius filter.
- **Markers**: Rotating plane icons showing real-time heading.
- **Spotter Aid**: Displays absolute bearing and distance on each flight card.

### 3. Location Modes
- **GPS Mode**: Automatically detects user position via browser geolocation.
- **Manual Mode**: A crosshair toggle allows users to click anywhere on the map to set a custom "spotter point," which repositions the search center and recalculates all relative distances/bearings.

### 4. Configuration & State
- **Settings Modal**: Centralized hub for Theme (Light/Dark/System) and Refresh Rate (5s to 60s, or Pause).
- **Persistence**: All user settings, including manual position and filters, are saved to `localStorage`.

## Data Sources
- **ADS-B Data**: Fetched via RapidAPI (ADSBExchange).
- **Mapping**: MapLibre GL + OSM/CartoDB.
- **Calculations**: Turf.js for distance, bearing, and sector geometry.

## File Structure
- `index.html`: Main layout and UI structure.
- `style.css`: Custom glassmorphic styling and layout.
- `main.js`: Core application logic, state management, and map handling.
- `utils/api.js`: ADS-B Exchange integration and data normalization.
- `utils/calculations.js`: Geospatial math (Distance, Bearing, Arc generation).
- `utils/ui-renderer.js`: Sidebar and card UI generation.
