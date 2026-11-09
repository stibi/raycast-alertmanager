# Alertmanager

View, inspect and silence [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) alerts from Raycast, across any number of Alertmanager instances.

## Features

- **Instance overview.** With more than one instance, you start on a grid of summary cards showing alert counts by severity for each instance.
- **Alert list.** Active alerts (not silenced, not inhibited) from all instances, grouped by `alertname`, with a colored tag for each instance. Sort by severity (default), newest, oldest or alert name.
- **Alert details.** Labels, annotations, start time, receivers, fingerprint and a link to the alert's source.
- **Silences.** Three ways to silence an alert:
  - **Silence Alert** opens a form with duration presets (1h to 7d), author and comment. It remembers what you entered last time.
  - **Instant Silence** silences the alert right away using your last duration, author and comment.
  - **Silence by Label** lets you pick labels from one or more alerts and builds the silence matchers from them.
- **Instance management.** Add, edit and remove Alertmanager instances, with optional basic auth. A connection test must pass before an instance is saved.

## Commands

| Command                           | Description                                |
| --------------------------------- | ------------------------------------------ |
| **List Alerts**                   | Instance overview and active alerts        |
| **Manage Alertmanager Instances** | Add, edit or remove Alertmanager instances |

## Setup

1. Run **Manage Alertmanager Instances**.
2. Choose **Add Instance** (`⌘ N`).
3. Enter a name, the base URL (for example `https://alertmanager.example.com`, without `/api/v2`) and, if needed, a username and password for basic auth.
4. Run **Test Connection**, then save.

Repeat for each instance. Instances are stored in Raycast's local storage on your Mac, which Raycast encrypts.

The extension uses the Alertmanager v2 API (`/api/v2/alerts`, `/api/v2/silences`, `/api/v2/status`).

## Keyboard Shortcuts

| Shortcut | Action                          |
| -------- | ------------------------------- |
| `↵`      | View alerts or alert details    |
| `⌘ S`    | Silence Alert (form)            |
| `⌘ ⇧ S`  | Instant Silence                 |
| `⌘ L`    | Silence by Label                |
| `⌘ R`    | Refresh                         |
| `⌘ O`    | Open alert source (detail view) |
| `⌘ C`    | Copy alert name (detail view)   |

## Development

Requires Node.js 22.22.2 or later.

```sh
npm install
npm run dev        # build, register with Raycast, hot reload
```

`npm run dev` registers the extension with Raycast. It stays installed after you stop the dev server. To update the installed copy later without the dev server, run `npm run build`, which writes to the same location Raycast loads it from.

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run build`     | Production build                                  |
| `npm run lint`      | ESLint, Prettier and manifest checks (`ray lint`) |
| `npm run fix-lint`  | Auto-fix lint and formatting                      |
| `npm run typecheck` | TypeScript check, including tests                 |
| `npm test`          | Unit tests (`node:test` + `tsx`)                  |

CI runs lint, typecheck, tests and build on every push and pull request.

### Project Structure

```
src/
├── list-alerts.tsx         # List Alerts command: instance grid and alert list
├── alert-group-list.tsx    # Alerts sharing one alertname
├── alert-detail.tsx        # Alert detail view
├── silence-form.tsx        # Silence form
├── instant-silence.tsx     # One-key silence action
├── silence-label-form.tsx  # Silence by label: label picker and confirm form
├── manage-instances.tsx    # Manage Instances command
├── alert-utils.ts          # Pure helpers: sorting, grouping, label collection
├── api.ts                  # Alertmanager v2 API client
├── storage.ts              # Instances and remembered silence settings
├── shortcuts.ts            # Extension-specific keyboard shortcuts
└── types.ts                # Types and constants
test/                       # Unit tests
```
