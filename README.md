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

## Packaging and Installing for Daily Use

To use the extension without running `npm run dev` every time:

1. **Build the extension:**

   ```sh
   npm run build
   ```

2. **Import into Raycast:**

   Open Raycast, run the **Import Extension** command, and select this project directory. Raycast will install the built extension locally.

   Alternatively, you can keep using `npm run dev` — Raycast will remember the extension between sessions. The only difference is that dev mode enables hot reload and shows a development indicator.

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
