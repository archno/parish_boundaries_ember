# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start          # Dev server at localhost:4200
npm run build          # Production build
npm run test           # Lint + QUnit tests (single run)
npm run test:ember -- --server  # Watch mode tests
npm run lint           # Check JS, CSS, Handlebars
npm run lint:fix       # Auto-fix lint issues
```

Run a single test file:
```bash
npx ember test --filter "unit:models/location"
```

## Architecture

This is a **single-page Ember 5.8 (Octane) app** — all UI logic lives in one component with no route hierarchy.

**Data flow:** The `parish-boundaries` component fetches `Location` records from a JSON:API backend (`config.host/locations`) filtered by the current map viewport. It uses an `ember-concurrency` restartable task (`fetchLocations`) so panning/zooming restarts the fetch rather than queuing multiple requests.

**Google Maps integration** is handled via `ember-google-maps` (Glimmer component library). On map load (`onLoad`), KML layers are added for parish boundaries or deaneries. Markers are rendered via `map-markers.hbs` using computed icon URLs from `location.icon` (`/m/p.png` for parish, `/m/s.png` for school, `/m/o.png` for office). The `m/` directory is excluded from Ember's asset fingerprinting so marker paths stay stable.

**Geolocation:** On load, the browser's geolocation API is called. If the user's position is within ~186 miles of New Orleans (circular geofence check), the map centers on them; otherwise it defaults to the New Orleans city center.

**Viewport radius search:** `calcDistance()` computes the visible map radius from the northeast/southwest bounds after every pan/zoom (debounced 1s via `onBoundsChanged`). This radius is passed to the backend query.

**Boundary overlays:** A `boundaries` toggle switches between parish KML and deaneries KML layers. URLs come from `config.PARISH_BOUNDARIES_KML_URL` and `config.DEANERIES_KML_URL` (set via `.env`).

## Environment Setup

Requires a `.env` file in the project root:
```
GOOGLE_MAPS_API_KEY=<key>
GOOGLE_MAP_ID=<id>
HOST=https://parish-boundaries.herokuapp.com
PARISH_BOUNDARIES_KML_URL=<GCS URL>
DEANERIES_KML_URL=<GCS URL>
```

For local development, the backend is expected at `localhost:3000`. `HOST` in `.env` sets the production API URL.

## Key Files

- `app/components/parish-boundaries.js` — ~90% of app logic (map init, geocoding, filtering, data fetch)
- `app/components/parish-boundaries.hbs` — Map layout and filter checkboxes
- `app/models/location.js` — Location model with computed `icon` and `mapPinLetter`
- `app/adapters/application.js` — JSONAPIAdapter pointing to `config.host`
- `config/environment.js` — ENV setup including Google Maps config
