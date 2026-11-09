// Pure helpers with no @raycast/api dependency, so they can be unit tested.
import { AlertmanagerInstance, AlertWithInstance } from "./types";

export type SortOption = "severity" | "age-desc" | "age-asc" | "alertname";

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const UNKNOWN_SEVERITY_RANK = 3;

function severityRank(severity: string | undefined): number {
  return (
    (severity ? SEVERITY_ORDER[severity] : undefined) ?? UNKNOWN_SEVERITY_RANK
  );
}

function startTime(alert: AlertWithInstance): number {
  return new Date(alert.startsAt).getTime();
}

export function sortAlerts(
  alerts: AlertWithInstance[],
  sort: SortOption,
): AlertWithInstance[] {
  return [...alerts].sort((a, b) => {
    switch (sort) {
      case "severity": {
        const diff =
          severityRank(a.labels.severity) - severityRank(b.labels.severity);
        if (diff !== 0) return diff;
        return startTime(b) - startTime(a);
      }
      case "age-desc":
        return startTime(b) - startTime(a);
      case "age-asc":
        return startTime(a) - startTime(b);
      case "alertname":
        return (a.labels.alertname || "").localeCompare(
          b.labels.alertname || "",
        );
    }
  });
}

export interface AlertGroup {
  alertname: string;
  alerts: AlertWithInstance[];
}

/** Groups alerts by alertname, keeping the order of each name's first occurrence. */
export function groupByAlertname(alerts: AlertWithInstance[]): AlertGroup[] {
  const groups = new Map<string, AlertWithInstance[]>();
  for (const alert of alerts) {
    const name = alert.labels.alertname || "Unknown Alert";
    const group = groups.get(name);
    if (group) group.push(alert);
    else groups.set(name, [alert]);
  }
  return [...groups].map(([alertname, alerts]) => ({ alertname, alerts }));
}

/** Most severe `severity` label in the group; the first alert's on ties. */
export function highestSeverityOf(alerts: AlertWithInstance[]): string {
  return alerts.reduce(
    (highest, a) =>
      severityRank(a.labels.severity) < severityRank(highest)
        ? a.labels.severity
        : highest,
    alerts[0]?.labels.severity || "",
  );
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface LabelEntry {
  key: string;
  value: string;
  id: string;
}

/** Unique `key=value` label pairs across alerts, sorted by `key=value`. */
export function collectUniqueLabels(alerts: AlertWithInstance[]): LabelEntry[] {
  const labels = new Map<string, LabelEntry>();
  for (const alert of alerts) {
    for (const [key, value] of Object.entries(alert.labels)) {
      const id = `${key}=${value}`;
      if (!labels.has(id)) labels.set(id, { key, value, id });
    }
  }
  return [...labels.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function collectUniqueInstances(
  alerts: AlertWithInstance[],
): AlertmanagerInstance[] {
  const map = new Map<string, AlertmanagerInstance>();
  for (const alert of alerts) {
    map.set(alert.instance.id, alert.instance);
  }
  return [...map.values()];
}
