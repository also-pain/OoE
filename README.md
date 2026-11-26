<h1 align="center">OoE — Order of Events</h1>

<p align="center">
  <strong>Cross-platform Android &amp; iOS utility for organizing and reminding upcoming events</strong><br/>
  <em>Built with Expo (React Native + TypeScript) and designed via Stitch MCP</em>
</p>

## Features

- **Today's Queue (Main Entry Page):** Displays today's events in chronological time-sorted order with an **Up Next** spotlight card, countdown badges, and a timeline rail.
- **Calendar Interface:** Interactive monthly calendar with event indicator dots and a day-by-day time-sorted agenda below.
- **4-Field Event Entry:**
  1. **Date &amp; Time**
  2. **Occasion** (short description)
  3. **Place / Location** (location name)
  4. **Organiser** (name of the organiser)
- **Configurable Reminders:** Local push notifications scheduled before each event (default: **3 hours before**, customizable in Settings).
- **Google Account Authentication &amp; Sync:** Sign in with Google to back up events to Google Drive `appDataFolder` and sync across Android and iOS devices using Last-Write-Wins merge (includes a built-in sandbox sync mode when OAuth client IDs are not yet configured).

## Running the App

```bash
npm install
npm start          # Start Expo dev server (scan QR with Expo Go on Android/iOS)
npm run android    # Launch on Android emulator/device
npm run ios        # Launch on iOS simulator (macOS)
npm run web        # Launch web preview
```

## Verification

```bash
npm run typecheck  # TypeScript check
npm test           # Unit tests for sorting, queue, calendar grid, reminders, and sync merge
```

## Google OAuth Configuration (Optional for Live Drive Sync)

Set the following environment variables in `.env` before building/running if you want live Google Drive AppData sync:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```
