# Pockt

A bookmarking app for saving, organising, and reading web content offline. Built as a PWA with optional Android APK packaging.

**[pockt.it](https://pockt.it)**

## Features

- **Save bookmarks** with auto-fetched page titles and descriptions
- **Reader view** - distraction-free offline reading with extracted article content
- **Tags** for organising bookmarks
- **Search** with deep search through cached page content
- **Three view modes** - Cards, List, and Compact
- **Dark mode** with system, light, and dark options
- **Offline-first** - all data stored locally in IndexedDB, works without network
- **Share target** - share URLs directly from the browser to Pockt (Android/PWA)
- **Sync** - sync bookmarks via OneDrive or a local folder (OneDrive, Dropbox, iCloud Drive, Google Drive)
- **Import/Export** - full data backup and restore as JSON
- **Installable PWA** with service worker for offline access
- **Android APK** via Trusted Web Activity

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, React Router
- **PWA**: Workbox (custom service worker with precaching, offline navigation, background sync)
- **Storage**: IndexedDB via `idb`, localStorage for config
- **API**: Azure Functions (Node.js) for server-side page fetching and content extraction
- **Server**: Hono (standalone alternative to Azure Functions)
- **Hosting**: Azure Static Web Apps
- **Android**: Trusted Web Activity via Bubblewrap

## Getting Started

```sh
# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Run locally (Hono server + Vite dev server)
npm run dev

# Or with Azure Functions (requires SWA CLI + Azure Functions Core Tools)
npm run dev:azure
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Hono API server + Vite dev server |
| `npm run dev:azure` | SWA CLI with Azure Functions + Vite |
| `npm run build` | Build frontend + API for production |
| `npm run server` | Run Hono production server (serves dist/) |
| `npm start` | Build and serve |

## Project Structure

```
src/
  components/       UI components (BookmarkCard, Layout, Icons, etc.)
  hooks/            React hooks (useBookmarks, useSync, useDebounce, etc.)
  pages/            Route pages (BookmarkList, AddBookmark, ViewBookmark, Settings)
  services/
    engines/        Storage engine abstraction (IndexedDB implementation)
    strategies/     Page fetch strategy abstraction (PWA proxy implementation)
    sync/           External storage providers (Folder, OneDrive)
  types/            TypeScript type definitions
  utils/            Shared utilities (formatting, sharing, ID generation)
  sw.ts             Custom service worker
  constants.ts      App-wide constants

api/                Azure Functions API
  src/functions/    HTTP-triggered functions
  src/              Shared server-side logic (content extraction)

server.ts           Standalone Hono server (alternative to Azure Functions)
```

## Sync Providers

### Local Folder
Uses the File System Access API to read/write to a folder on your device. If the folder is inside a cloud sync service (OneDrive, Dropbox, iCloud Drive, Google Drive), your bookmarks sync across devices automatically.

### OneDrive
Direct OAuth connection to Microsoft OneDrive. Stores data in `OneDrive/PocktDb/`. Uses eTag-based change detection for efficient startup sync. Requires a `POCKT_ONEDRIVE_CLIENT_ID` in `.env` (Azure App Registration with SPA redirect URI).

## Offline Architecture

- All bookmark CRUD operations write to IndexedDB immediately
- Page content is fetched via the server-side API proxy (bypasses CORS), extracted into reader-friendly HTML, and stored locally
- If offline when adding a bookmark, the snapshot fetch is queued for background sync
- The service worker precaches the app shell and caches API responses for offline access
- On reconnect, queued fetches are processed and sync pushes to the configured provider

## Android APK

The app can be packaged as an Android APK using a Trusted Web Activity (TWA). The APK is a thin Android wrapper that opens Chrome in full-screen mode pointing at the deployed PWA.

Build via GitHub Actions: push a tag (`git tag v0.0.1 && git push origin v0.0.1`) or trigger the "Build Android APK" workflow manually.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POCKT_ONEDRIVE_CLIENT_ID` | Azure App Registration client ID for OneDrive sync |

## License

MIT
