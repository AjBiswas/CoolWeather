# CoolWeather

CoolWeather is a Windows-focused desktop weather app concept built with Electron, React, TypeScript, and Three.js. This starter includes a cinematic UI shell, an interactive 3D weather scene, and desktop packaging configuration for Windows.

## What is included

- Electron desktop shell for Windows-friendly distribution
- React + TypeScript renderer app
- Three.js-powered animated weather globe
- Mock city presets to preview different weather moods
- `electron-builder` config for generating a Windows installer

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.

## Build for Windows

1. Run `npm run dist`.
2. The packaged installer will be generated from the Electron build output.

## Next steps

- Replace mock weather data in `src/data/mockWeather.ts` with a live weather API.
- Add condition mapping for day/night, UV, precipitation intensity, and air quality.
- Persist recent locations and preferences.
- Add temperature unit switching and animated transitions between weather states.
