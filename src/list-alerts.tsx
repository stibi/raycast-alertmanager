import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertmanagerInstance, AlertWithInstance } from "./types";
import { getInstances } from "./storage";
import { fetchAlerts } from "./api";
import { AlertDetail } from "./alert-detail";
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

export default function ListAlerts() {
  const [alerts, setAlerts] = useState<AlertWithInstance[]>([]);
  const [instances, setInstances] = useState<AlertmanagerInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string>("all");

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

      allAlerts.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      setAlerts(allAlerts);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Error", String(e));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts =
    selectedInstance === "all" ? alerts : alerts.filter((a) => a.instance.id === selectedInstance);

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
      {filteredAlerts.map((alert) => {
        const instIndex = instances.findIndex((i) => i.id === alert.instance.id);
        const alertname = alert.labels.alertname || "Unknown Alert";
        const severity = alert.labels.severity;

        return (
          <List.Item
            key={`${alert.instance.id}-${alert.fingerprint}`}
            title={alertname}
            subtitle={alert.annotations.summary || alert.annotations.description || ""}
            keywords={[alert.instance.name, ...Object.values(alert.labels)]}
            accessories={[
              severity
                ? {
                    tag: {
                      value: severity,
                      color: severity === "critical" ? Color.Red : severity === "warning" ? Color.Orange : Color.Yellow,
                    },
                  }
                : {},
              { tag: { value: alert.instance.name, color: instanceColor(instIndex) } },
              { date: new Date(alert.startsAt), tooltip: `Started: ${new Date(alert.startsAt).toLocaleString()}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<AlertDetail alert={alert} instanceColor={instanceColor(instIndex)} />}
                />
                <Action.Push
                  title="Silence Alert"
                  icon={Icon.BellDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  target={<SilenceForm alert={alert} onSilenced={loadAlerts} />}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadAlerts} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
