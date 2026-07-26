# هيئة النقل · نظام البوابير

A mobile-style Arabic transport management system built with **Figma Make** (React + Vite + TypeScript + Tailwind CSS v4). The UI renders inside a phone frame in the browser.

## Stack

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS v4
- **Package manager:** pnpm

## Running the app

```bash
PORT=5000 pnpm dev
```

The dev server starts on port 5000. The workflow **"Start application"** is already configured to run this command automatically.

## Project structure

```
src/
  App.tsx          # Root component + phone frame + router
  context.tsx      # Global app state (AppProvider / useApp)
  components.tsx   # Shared components (BottomNav, Snackbar, …)
  data.ts          # Mock data
  screens/         # All screen components (Login, Home, Drivers, …)
  imports/         # Auto-generated Figma Make imports
```

## Screens

Login → Home → Drivers → DriverProfile → PendingTrips → Attendance → Registration → Violations → Guarantees → Breakdowns → Reports → Users → More → Settings → Search → Notifications

## User preferences

- Arabic RTL UI; keep all UI text in Arabic unless otherwise asked.
