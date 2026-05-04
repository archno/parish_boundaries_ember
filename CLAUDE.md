# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start          # Dev server at localhost:4200
npm run build          # Production build
npm run test           # Lint + QUnit tests (single run)
npm run test:ember -- --server  # Watch mode tests
npm run lint           # Check JS, CSS, GJS
npm run lint:fix       # Auto-fix lint issues
```

Run a single test file:
```bash
npx ember test --filter "unit:models/location"
```

## Architecture

This is a **single-page Ember app (Vite + Embroider)** — all UI logic lives in one component with no route hierarchy. Templates use **GJS** (Glimmer JS) format — `<template>` blocks are co-located inside the component class file.

**Data flow:** The `parish-boundaries` component fetches `Location` records from a JSON:API backend (`config.host/locations`) filtered by the current map viewport. It uses an `ember-concurrency` restartable task (`fetchLocations`) so panning/zooming restarts the fetch rather than queuing multiple requests.

**Google Maps integration** is loaded via `@googlemaps/js-api-loader` through the `google-maps` service (`app/services/google-maps.js`). The map is mounted imperatively using an `ember-modifier` (`mapModifier`) that calls `setupMap(element)` on the DOM node. Markers use `google.maps.marker.AdvancedMarkerElement` and are managed in a `markers = new Map()` keyed by location ID. Marker icons come from `location.icon` (`/m/P.png` for parish, `/m/S.png` for school, `/m/O.png` for office). The `m/` directory is excluded from fingerprinting so marker paths stay stable.

**Geolocation:** On load, the browser's geolocation API is called. If the user's position is within ~186 miles of New Orleans (circular geofence check), the map centers on them; otherwise it defaults to the New Orleans city center.

**Viewport radius search:** `calcDistance()` computes the visible map radius from the northeast/southwest bounds after every pan/zoom (debounced 1s via `bounds_changed`). This radius is passed to the backend query.

**Boundary overlays:** A `boundaries` toggle switches between two `google.maps.Data` layers loaded from local GeoJSON files in `public/`. Styles are read from each feature's properties (`fill`, `fill-opacity`, `stroke`, etc.). Clicking a feature opens a `google.maps.InfoWindow`. A `_markerClicked` flag prevents the data layer click from firing when a marker is clicked.

## Environment Setup

Requires a `.env` file in the project root:
```
GOOGLE_MAPS_API_KEY=<key>
GOOGLE_MAP_ID=<id>
HOST=https://parish-boundaries.herokuapp.com
```

For local development, the backend is expected at `localhost:3000`. `HOST` in `.env` sets the production API URL.

## Key Files

- `app/components/parish-boundaries.gjs` — All component logic and template (map init, geocoding, filtering, data fetch, GeoJSON layers)
- `app/services/google-maps.js` — Loads the Maps JS API via `@googlemaps/js-api-loader`; caches the load promise
- `app/templates/application.gjs` — Root layout (header, footer, `{{outlet}}`)
- `app/models/location.js` — Location model with computed `icon`, `mapPinLetter`, and `iconImg`
- `app/adapters/application.js` — JSONAPIAdapter pointing to `config.host`
- `config/environment.js` — ENV setup including Google Maps API key and map ID
