import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { AlertWithInstance } from "./types";
import { SilenceForm } from "./silence-form";

export function AlertDetail({ alert, instanceColor }: { alert: AlertWithInstance; instanceColor: Color }) {
  const alertname = alert.labels.alertname || "Unknown Alert";

  const labelRows = Object.entries(alert.labels)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n");

  const annotationRows = Object.entries(alert.annotations)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n");

  const markdown = `# ${alertname}

## Labels
| Label | Value |
|-------|-------|
${labelRows}

## Annotations
| Key | Value |
|-----|-------|
${annotationRows}

## Timing
- **Started:** ${new Date(alert.startsAt).toLocaleString()}
- **Updated:** ${new Date(alert.updatedAt).toLocaleString()}

${alert.generatorURL ? `[Open in source](${alert.generatorURL})` : ""}
`;

  return (
    <Detail
      navigationTitle={alertname}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Instance">
            <Detail.Metadata.TagList.Item text={alert.instance.name} color={instanceColor} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={alert.status.state}
              color={alert.status.state === "active" ? Color.Red : Color.Orange}
            />
          </Detail.Metadata.TagList>
          {alert.labels.severity && (
            <Detail.Metadata.TagList title="Severity">
              <Detail.Metadata.TagList.Item
                text={alert.labels.severity}
                color={
                  alert.labels.severity === "critical"
                    ? Color.Red
                    : alert.labels.severity === "warning"
                      ? Color.Orange
                      : Color.Yellow
                }
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Fingerprint" text={alert.fingerprint} />
          <Detail.Metadata.Label title="Started" text={new Date(alert.startsAt).toLocaleString()} />
          {alert.receivers.length > 0 && (
            <Detail.Metadata.Label title="Receivers" text={alert.receivers.map((r) => r.name).join(", ")} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Silence Alert"
            icon={Icon.BellDisabled}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<SilenceForm alert={alert} />}
          />
          {alert.generatorURL && (
            <Action.OpenInBrowser title="Open in Source" url={alert.generatorURL} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          )}
          <Action.CopyToClipboard title="Copy Alert Name" content={alertname} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
