import { Action, ActionPanel, Color, environment, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertmanagerInstance, AlertWithInstance } from "./types";
import { getInstances } from "./storage";
import { fetchAlerts } from "./api";
import { AlertDetail } from "./alert-detail";
import { AlertGroupList } from "./alert-group-list";
import { SilenceForm } from "./silence-form";
import { InstantSilenceAction } from "./instant-silence";

const INSTANCE_COLORS: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
  Color.Magenta,
  Color.PrimaryText,
];

function instanceColor(index: number): Color {
  return INSTANCE_COLORS[index % INSTANCE_COLORS.length];
}

type SortOption = "severity" | "age-desc" | "age-asc" | "alertname";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function sortAlerts(alerts: AlertWithInstance[], sort: SortOption): AlertWithInstance[] {
  return [...alerts].sort((a, b) => {
    switch (sort) {
      case "severity": {
        const sa = SEVERITY_ORDER[a.labels.severity] ?? 3;
        const sb = SEVERITY_ORDER[b.labels.severity] ?? 3;
        if (sa !== sb) return sa - sb;
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      }
      case "age-desc":
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      case "age-asc":
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      case "alertname":
        return (a.labels.alertname || "").localeCompare(b.labels.alertname || "");
    }
  });
}

/* ─── Instance Summary Grid ─── */

const INSTANCE_HEX_COLORS = [
  "#4A9EF5", // Blue
  "#50C878", // Green
  "#9B59B6", // Purple
  "#E91E8C", // Pink
  "#1ABC9C", // Teal
  "#FF8C42", // Orange
  "#6C5CE7", // Indigo
  "#00CEC9", // Cyan
];

interface InstanceAlertSummary {
  instance: AlertmanagerInstance;
  total: number;
  critical: number;
  warning: number;
  info: number;
  other: number;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function blendColors(bg: [number, number, number], fg: [number, number, number], alpha: number): string {
  const r = Math.round(bg[0] + (fg[0] - bg[0]) * alpha);
  const g = Math.round(bg[1] + (fg[1] - bg[1]) * alpha);
  const b = Math.round(bg[2] + (fg[2] - bg[2]) * alpha);
  return `rgb(${r},${g},${b})`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function generateSummarySVG(
  name: string,
  total: number,
  critical: number,
  warning: number,
  info: number,
  other: number,
  accentHex: string,
): string {
  const isDark = environment.appearance === "dark";
  const accent = hexToRgb(accentHex);
  const bgRgb: [number, number, number] = isDark ? [28, 28, 30] : [245, 245, 247];

  const w = 400;
  const h = 260;
  const pad = 28;
  const br = 16;
  const bw = 3;

  const bgTinted = blendColors(bgRgb, accent, isDark ? 0.12 : 0.08);
  const textPrimary = isDark ? "#FFFFFF" : "#1C1C1E";
  const textSecondary = isDark ? "#8E8E93" : "#6C6C70";

  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
  p.push(`<rect width="${w}" height="${h}" rx="${br}" fill="${bgTinted}"/>`);
  p.push(`<rect x="${bw / 2}" y="${bw / 2}" width="${w - bw}" height="${h - bw}" rx="${br}" fill="none" stroke="${accentHex}" stroke-width="${bw}" stroke-opacity="0.7"/>`);

  const headerY = 44;
  p.push(`<text x="${pad}" y="${headerY}" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="${accentHex}" letter-spacing="1.5">${escapeXml(name.toUpperCase())}</text>`);
  p.push(`<text x="${w - pad}" y="${headerY + 36}" font-family="-apple-system, sans-serif" font-size="64" font-weight="800" fill="${textPrimary}" text-anchor="end">${total}</text>`);

  if (total === 0) {
    p.push(`<text x="${pad}" y="${headerY + 48}" font-family="-apple-system, sans-serif" font-size="22" fill="#30D158" font-weight="600">No active alerts</text>`);
  } else {
    let y = headerY + 48;
    const severities: [number, string, string][] = [];
    if (critical > 0) severities.push([critical, "critical", "#FF453A"]);
    if (warning > 0) severities.push([warning, "warning", "#FF9F0A"]);
    if (info > 0) severities.push([info, "info", "#FFD60A"]);
    if (other > 0) severities.push([other, "other", textSecondary]);

    for (const [count, label, color] of severities) {
      p.push(`<circle cx="${pad + 8}" cy="${y - 5}" r="7" fill="${color}"/>`);
      p.push(`<text x="${pad + 26}" y="${y}" font-family="-apple-system, sans-serif" font-size="20" fill="${textPrimary}" font-weight="500">${count} ${label}</text>`);
      y += 34;
    }
  }

  p.push(`</svg>`);
  return p.join("");
}

function InstanceSummary({ instances }: { instances: AlertmanagerInstance[] }) {
  const [summaries, setSummaries] = useState<InstanceAlertSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummaries() {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(
        instances.map(async (inst) => {
          const alerts = await fetchAlerts(inst);
          const critical = alerts.filter((a) => a.labels.severity === "critical").length;
          const warning = alerts.filter((a) => a.labels.severity === "warning").length;
          const info = alerts.filter((a) => a.labels.severity === "info").length;
          return {
            instance: inst,
            total: alerts.length,
            critical,
            warning,
            info,
            other: alerts.length - critical - warning - info,
          };
        }),
      );

      const newSummaries: InstanceAlertSummary[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          newSummaries.push(result.value);
        } else {
          await showToast(Toast.Style.Failure, "Error fetching alerts", String(result.reason));
        }
      }
      setSummaries(newSummaries);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Error", String(e));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadSummaries();
  }, []);

  return (
    <Grid
      isLoading={isLoading}
      columns={instances.length === 2 ? 2 : 3}
      aspectRatio="3/2"
      searchBarPlaceholder="Filter instances..."
    >
      <Grid.EmptyView
        title="No Alerts Data"
        description="Could not fetch alerts from any instance"
        icon={Icon.Warning}
      />
      {summaries.map((summary) => {
        const colorIndex = instances.findIndex((i) => i.id === summary.instance.id);
        const accentHex = INSTANCE_HEX_COLORS[Math.max(0, colorIndex) % INSTANCE_HEX_COLORS.length];
        const svgContent = generateSummarySVG(
          summary.instance.name,
          summary.total,
          summary.critical,
          summary.warning,
          summary.info,
          summary.other,
          accentHex,
        );

        return (
          <Grid.Item
            key={summary.instance.id}
            content={{ source: `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}` }}
            keywords={[summary.instance.name, summary.instance.url]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Alerts"
                  icon={Icon.List}
                  target={<AlertsList filterInstanceId={summary.instance.id} />}
                />
                <Action.Push
                  title="View All Alerts"
                  icon={Icon.Globe}
                  target={<AlertsList />}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadSummaries}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

/* ─── Alerts List ─── */

function AlertsList({ filterInstanceId }: { filterInstanceId?: string } = {}) {
  const [alerts, setAlerts] = useState<AlertWithInstance[]>([]);
  const [instances, setInstances] = useState<AlertmanagerInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("severity");

  async function loadAlerts() {
    setIsLoading(true);
    try {
      const loadedInstances = await getInstances();
      setInstances(loadedInstances);

      const instancesToFetch = filterInstanceId
        ? loadedInstances.filter((i) => i.id === filterInstanceId)
        : loadedInstances;

      if (instancesToFetch.length === 0) {
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        instancesToFetch.map(async (inst) => {
          const alerts = await fetchAlerts(inst);
          return alerts.map((a) => ({ ...a, instance: inst }));
        }),
      );

      const allAlerts: AlertWithInstance[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          allAlerts.push(...result.value);
        } else {
          await showToast(Toast.Style.Failure, "Error", String(result.reason));
        }
      }

      setAlerts(allAlerts);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Error", String(e));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = sortAlerts(
    selectedInstance === "all" ? alerts : alerts.filter((a) => a.instance.id === selectedInstance),
    sortBy,
  );

  // Group alerts by alertname, preserving sort order of first occurrence
  const grouped: { alertname: string; alerts: AlertWithInstance[] }[] = [];
  const groupMap = new Map<string, AlertWithInstance[]>();
  for (const alert of filteredAlerts) {
    const name = alert.labels.alertname || "Unknown Alert";
    if (!groupMap.has(name)) {
      const group: AlertWithInstance[] = [];
      groupMap.set(name, group);
      grouped.push({ alertname: name, alerts: group });
    }
    groupMap.get(name)!.push(alert);
  }

  const showDropdown = !filterInstanceId && instances.length > 1;

  function sortActions() {
    return (
      <ActionPanel.Submenu title="Sort By" icon={Icon.ArrowUp} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
        <Action title="Severity" icon={sortBy === "severity" ? Icon.Checkmark : undefined} onAction={() => setSortBy("severity")} />
        <Action title="Newest First" icon={sortBy === "age-desc" ? Icon.Checkmark : undefined} onAction={() => setSortBy("age-desc")} />
        <Action title="Oldest First" icon={sortBy === "age-asc" ? Icon.Checkmark : undefined} onAction={() => setSortBy("age-asc")} />
        <Action title="Alert Name" icon={sortBy === "alertname" ? Icon.Checkmark : undefined} onAction={() => setSortBy("alertname")} />
      </ActionPanel.Submenu>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter alerts by name, label, or instance..."
      searchBarAccessory={
        showDropdown ? (
          <List.Dropdown tooltip="Instance" value={selectedInstance} onChange={setSelectedInstance}>
            <List.Dropdown.Item title="All Instances" value="all" />
            {instances.map((inst) => (
              <List.Dropdown.Item key={inst.id} title={inst.name} value={inst.id} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        title={instances.length === 0 ? "No Instances Configured" : "No Active Alerts"}
        description={instances.length === 0 ? 'Use "Manage Alertmanager Instances" to add one' : "All clear!"}
        icon={instances.length === 0 ? Icon.Gear : Icon.CheckCircle}
      />
      {grouped.map(({ alertname, alerts: groupAlerts }) => {
        const isGrouped = groupAlerts.length > 1;
        const representative = groupAlerts[0];
        const instIndex = instances.findIndex((i) => i.id === representative.instance.id);
        const severity = representative.labels.severity;
        const highestSeverity = groupAlerts.reduce((highest, a) => {
          const order = SEVERITY_ORDER[a.labels.severity] ?? 3;
          return order < (SEVERITY_ORDER[highest] ?? 3) ? a.labels.severity : highest;
        }, representative.labels.severity || "");

        const accessories: List.Item.Accessory[] = [];
        if (isGrouped) {
          accessories.push({ text: `${groupAlerts.length}`, icon: Icon.Layers });
        }
        const displaySeverity = isGrouped ? highestSeverity : severity;
        if (displaySeverity) {
          accessories.push({
            tag: {
              value: displaySeverity,
              color: displaySeverity === "critical" ? Color.Red : displaySeverity === "warning" ? Color.Orange : Color.Yellow,
            },
          });
        }
        if (isGrouped) {
          const instanceNames = [...new Set(groupAlerts.map((a) => a.instance.name))];
          for (const name of instanceNames) {
            const idx = instances.findIndex((i) => i.name === name);
            accessories.push({ tag: { value: name, color: instanceColor(idx) } });
          }
        } else {
          accessories.push({ tag: { value: representative.instance.name, color: instanceColor(instIndex) } });
          accessories.push({ date: new Date(representative.startsAt), tooltip: `Started: ${new Date(representative.startsAt).toLocaleString()}` });
        }

        return (
          <List.Item
            key={alertname}
            title={alertname}
            subtitle={isGrouped ? "" : representative.annotations.summary || representative.annotations.description || ""}
            keywords={[
              ...groupAlerts.flatMap((a) => [a.instance.name, ...Object.values(a.labels)]),
            ]}
            accessories={accessories}
            actions={
              <ActionPanel>
                {isGrouped ? (
                  <Action.Push
                    title="View Alerts"
                    icon={Icon.List}
                    target={
                      <AlertGroupList
                        alertname={alertname}
                        alerts={groupAlerts}
                        instances={instances}
                        onSilenced={loadAlerts}
                      />
                    }
                  />
                ) : (
                  <>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<AlertDetail alert={representative} instanceColor={instanceColor(instIndex)} />}
                    />
                    <Action.Push
                      title="Silence Alert"
                      icon={Icon.BellDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      target={<SilenceForm alert={representative} onSilenced={loadAlerts} />}
                    />
                    <InstantSilenceAction alert={representative} onSilenced={loadAlerts} />
                  </>
                )}
                {sortActions()}
                <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadAlerts} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/* ─── Command Entry Point ─── */

export default function Command() {
  const [instances, setInstances] = useState<AlertmanagerInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getInstances().then((inst) => {
      setInstances(inst);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <List isLoading />;
  }

  if (instances.length > 1) {
    return <InstanceSummary instances={instances} />;
  }

  return <AlertsList />;
}
