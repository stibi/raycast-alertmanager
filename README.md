# Alertmanager Raycast Extension

A Raycast extension for interacting with [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/). View active alerts, inspect details, and create silences — across multiple Alertmanager instances.

## Features

- **List active alerts** from all configured Alertmanager instances in a single view
- **Color-coded instance tags** so you always know which alert comes from where
- **Filter by instance** using the dropdown when you have multiple sources
- **Alert detail view** with all labels, annotations, timing, receivers, and a link to the alert source
- **Silence alerts** with duration presets (1h, 2h, 4h, 8h, 24h, 3d, 7d) — remembers your last choice
- **Manage instances** — add, edit, and remove Alertmanager connections with basic auth support

## Commands

| Command | Description |
|---------|-------------|
| **List Alerts** | View active (non-silenced, non-inhibited) alerts from all instances |
| **Manage Alertmanager Instances** | Add, edit, or remove Alertmanager connections |

### Keyboard Shortcuts (in alert list/detail)

| Shortcut | Action |
|----------|--------|
| `Enter` | View alert details |
| `⌘ S` | Silence alert |
| `⌘ R` | Refresh alerts |
| `⌘ O` | Open alert source URL (in detail view) |
| `⌘ C` | Copy alert name (in detail view) |

## Setup

### Prerequisites

- [Raycast](https://raycast.com/) installed
- [Node.js](https://nodejs.org/) 18+
- npm

### Install Dependencies

```sh
npm install
```

### Configure Instances

1. Open Raycast and run **Manage Alertmanager Instances**
2. Press `⌘ N` to add a new instance
3. Fill in the name, URL (e.g. `https://alertmanager.example.com`), and optionally basic auth credentials
4. Repeat for each Alertmanager instance

## Development

Start the extension in dev mode with hot reload:

```sh
npm run dev
```

This compiles the extension and connects it to Raycast. Any changes to the source files will trigger a rebuild automatically. Open Raycast and search for "List Alerts" or "Manage Alertmanager Instances" to test.

Other useful commands:

```sh
npm run build      # One-off production build
npm run lint       # Run linter
npm run fix-lint   # Auto-fix lint issues
```

## Installing for Daily Use

Run `npm run dev` once from the project directory. This builds the extension, registers it with Raycast, and enables hot reload for development.

The extension **stays registered in Raycast** even after you stop the dev server or close the terminal — you can use it any time from Raycast without keeping anything running.

Re-run `npm run dev` only when you make code changes and want to rebuild.

## Project Structure

```
src/
├── api.ts                 # Alertmanager HTTP client (v2 API)
├── types.ts               # TypeScript types and constants
├── storage.ts             # Instance config and preferences (LocalStorage)
├── list-alerts.tsx         # Main command — alert list view
├── alert-detail.tsx        # Alert detail view (push navigation)
├── silence-form.tsx        # Silence creation form
└── manage-instances.tsx    # Instance management command
```
