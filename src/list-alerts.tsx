import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertmanagerInstance, AlertWithInstance } from "./types";
import { getInstances } from "./storage";
import { fetchAlerts } from "./api";
import { AlertDetail } from "./alert-detail";
import { AlertGroupList } from "./alert-group-list";
import { SilenceForm } from "./silence-form";

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

export default function ListAlerts() {
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

      if (loadedInstances.length === 0) {
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        loadedInstances.map(async (inst) => {
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
        instances.length > 1 ? (
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
