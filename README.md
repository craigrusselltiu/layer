# Layer

A static, warmth-first travel wardrobe. Multi-city trips, a rotating low-poly mannequin, destination temperature map, and one packing checklist.

## Run

```sh
npm ci
npm run dev
```

## GitHub Pages

Push this directory to a GitHub repository on `main`. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The included workflow tests, builds and deploys the static `dist/` directory. Vite uses relative asset paths, so both project and custom-domain Pages work. No server, account, secrets, or API keys are needed by the app.

## How it works

- Open-Meteo geocoding resolves selected cities, including country and region to distinguish names.
- Forecasts cover up to 16 days. Later dates use the same calendar dates from five complete previous years of reanalysis data. Each day explicitly says Forecast or Historical estimate. If the forecast service fails, the app labels the historical fallback and shows a notice.
- Daily apparent highs drive Day outfits; apparent lows drive Night outfits. Wind and humidity are already reflected in apparent temperature. Sensitivity shifts the clothing threshold by ±3°C, and activity by −3°C (resting) or +4°C (active). These are transparent comfort heuristics, not a validated physiological model.
- Warmth bands: under −10°C, −10–0°C, 0–8°C, 8–15°C, 15–20°C, 20–25°C, and 25°C+. Layer weights increase as it gets colder. Rain of at least 1 mm adds a waterproof shell.
- Packing combines day and night outfits across every day and stop. It lists garment types, not quantities or a full holiday packing list.
- Map halos show the mean apparent temperature for each stop, for the selected day/night mode. They are destination markers, not an interpolated regional forecast. Lines follow visit order and cross the date line by the shorter longitude path.
- Trip inputs, preferences and checked items live in localStorage. Weather is cached in memory (30 minutes for forecast, 24 hours for history). No analytics.

The interface and recommendation list work without WebGL; a simple mannequin fallback is provided. An internet connection is needed for city search, weather and OpenStreetMap tiles. The 3D mannequin, styles and scripts are bundled locally.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests use deterministic API fixtures; live API connectivity is checked separately. Clothing guidance is intended for everyday travel, not extreme-weather or specialist expedition planning.

## Data and libraries

[Open-Meteo](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); free hosted API is for non-commercial use), [GeoNames](https://www.geonames.org/) through Open-Meteo, [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), [Three.js](https://threejs.org/) (MIT), and [Leaflet](https://leafletjs.com/) (BSD-2-Clause). Check provider terms before commercial deployment. Reanalysis averages are not future forecasts.
