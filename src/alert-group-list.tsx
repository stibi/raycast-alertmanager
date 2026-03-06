import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { AlertmanagerInstance, AlertWithInstance } from "./types";
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

function instanceColor(instances: AlertmanagerInstance[], instanceId: string): Color {
  const index = instances.findIndex((i) => i.id === instanceId);
  return INSTANCE_COLORS[index >= 0 ? index % INSTANCE_COLORS.length : 0];
}

export function AlertGroupList({
  alertname,
  alerts,
  instances,
  onSilenced,
}: {
  alertname: string;
  alerts: AlertWithInstance[];
  instances: AlertmanagerInstance[];
  onSilenced?: () => void;
}) {
  return (
    <List navigationTitle={`${alertname} (${alerts.length})`} searchBarPlaceholder="Filter alerts...">
      {alerts.map((alert) => {
        const color = instanceColor(instances, alert.instance.id);
        const severity = alert.labels.severity;
        const distinguishingLabels = Object.entries(alert.labels)
          .filter(([k]) => k !== "alertname" && k !== "severity")
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");

        return (
          <List.Item
            key={`${alert.instance.id}-${alert.fingerprint}`}
            title={distinguishingLabels || alertname}
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
              { tag: { value: alert.instance.name, color } },
              { date: new Date(alert.startsAt), tooltip: `Started: ${new Date(alert.startsAt).toLocaleString()}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<AlertDetail alert={alert} instanceColor={color} />}
                />
                <Action.Push
                  title="Silence Alert"
                  icon={Icon.BellDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  target={<SilenceForm alert={alert} onSilenced={onSilenced} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
