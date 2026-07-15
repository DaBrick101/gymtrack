# GymTrack (Iron Log)

GymTrack is a React + Vite fitness tracking app for planning workouts, logging sets, and monitoring progress over time.

## Features

- Create and manage exercises by muscle group
- Build reusable workout plans (for example push/pull days)
- Start workout sessions and log sets (weight × reps)
- View workout history with total volume per session
- Track progress with charts for max weight and volume
- Export and import backup data as JSON

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS 4
- Recharts
- Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm ci
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

- `src/App.jsx` – main application UI and workout logic
- `src/main.jsx` – React entry point
- `src/index.css` – Tailwind import
- `index.html` – app shell

## Data

The app stores workout data through the browser runtime storage interface used by the app (`window.storage`) and supports JSON export/import for backup and restore.
