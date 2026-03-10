import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertmanagerInstance, AlertWithInstance, SILENCE_DURATIONS, SilenceMatcher } from "./types";
import { createSilence } from "./api";
import { getLastSilenceAuthor, getLastSilenceComment, getLastSilenceDuration, setLastSilenceAuthor, setLastSilenceComment, setLastSilenceDuration } from "./storage";

interface LabelEntry {
  key: string;
  value: string;
  id: string;
}

function collectUniqueLabels(alerts: AlertWithInstance[]): LabelEntry[] {
  const labels: LabelEntry[] = [];
  const seen = new Set<string>();
  for (const alert of alerts) {
    for (const [key, value] of Object.entries(alert.labels)) {
      const id = `${key}=${value}`;
      if (!seen.has(id)) {
        seen.add(id);
        labels.push({ key, value, id });
      }
    }
  }
  labels.sort((a, b) => a.id.localeCompare(b.id));
  return labels;
}

function collectUniqueInstances(alerts: AlertWithInstance[]): AlertmanagerInstance[] {
  const map = new Map<string, AlertmanagerInstance>();
  for (const alert of alerts) {
    map.set(alert.instance.id, alert.instance);
  }
  return [...map.values()];
}

/* ─── Screen 1: Label Picker ─── */

export function SilenceLabelForm({
  alerts,
  onSilenced,
  popParent,
}: {
  alerts: AlertWithInstance[];
  onSilenced?: () => void;
  popParent?: () => void;
}) {
  const { pop: popLabelPicker } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const uniqueLabels = collectUniqueLabels(alerts);
  const instances = collectUniqueInstances(alerts);

  function toggleLabel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const continueTarget = selected.size > 0 ? (
    <SilenceLabelConfirm
      selectedLabels={uniqueLabels.filter((l) => selected.has(l.id))}
      instances={instances}
      onSilenced={onSilenced}
      popLabelPicker={popLabelPicker}
      popParent={popParent}
    />
  ) : undefined;

  return (
    <List
      navigationTitle="Silence by Label"
      searchBarPlaceholder="Search labels..."
    >
      {continueTarget && (
        <List.Section title="Actions">
          <List.Item
            key="__continue__"
            title={`Continue with ${selected.size} label${selected.size !== 1 ? "s" : ""}`}
            icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
            accessories={[{ tag: { value: "Enter", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action.Push title="Continue" icon={Icon.ArrowRight} target={continueTarget} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Labels">
        {uniqueLabels.map((label) => {
          const isSelected = selected.has(label.id);
          return (
            <List.Item
              key={label.id}
              title={label.id}
              icon={isSelected ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.Checkmark}
                    onAction={() => toggleLabel(label.id)}
                  />
                  {continueTarget && (
                    <Action.Push
                      title={`Continue with ${selected.size} Label${selected.size !== 1 ? "s" : ""}`}
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      target={continueTarget}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/* ─── Screen 2: Confirm & Create ─── */

function SilenceLabelConfirm({
  selectedLabels,
  instances,
  onSilenced,
  popLabelPicker,
  popParent,
}: {
  selectedLabels: LabelEntry[];
  instances: AlertmanagerInstance[];
  onSilenced?: () => void;
  popLabelPicker: () => void;
  popParent?: () => void;
}) {
  const { pop } = useNavigation();
  const [lastDuration, setLastDuration] = useState<string>("2");
  const [lastAuthor, setLastAuthor] = useState<string>("");
  const [lastComment, setLastComment] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getLastSilenceDuration(), getLastSilenceAuthor(), getLastSilenceComment()]).then(
      ([d, a, c]) => {
        setLastDuration(String(d));
        setLastAuthor(a);
        setLastComment(c);
        setIsLoaded(true);
      },
    );
  }, []);

  async function handleSubmit(values: { duration: string; createdBy: string; comment: string }) {
    if (!values.createdBy.trim()) {
      await showToast(Toast.Style.Failure, "Author is required");
      return;
    }
    if (!values.comment.trim()) {
      await showToast(Toast.Style.Failure, "Comment is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const matchers: SilenceMatcher[] = selectedLabels.map((l) => ({
        name: l.key,
        value: l.value,
        isRegex: false,
        isEqual: true,
      }));

      const durationHours = Number(values.duration);

      await Promise.all(
        instances.map((inst) => createSilence(inst, matchers, durationHours, values.createdBy, values.comment)),
      );

      await Promise.all([
        setLastSilenceDuration(durationHours),
        setLastSilenceAuthor(values.createdBy),
        setLastSilenceComment(values.comment),
      ]);

      const instanceNames = instances.map((i) => i.name).join(", ");
      await showToast(Toast.Style.Success, "Silence Created", `${selectedLabels.map((l) => l.id).join(", ")} on ${instanceNames}`);
      onSilenced?.();
      pop();
      popLabelPicker();
      popParent?.();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed", String(e));
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      navigationTitle="Create Silence"
      isLoading={isSubmitting || !isLoaded}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Silence" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isLoaded && (
        <>
          <Form.Description title="Labels" text={selectedLabels.map((l) => l.id).join("\n")} />
          <Form.Description title="Instances" text={instances.map((i) => i.name).join(", ")} />
          <Form.Separator />

          <Form.Dropdown id="duration" title="Duration" defaultValue={lastDuration}>
            {SILENCE_DURATIONS.map((d) => (
              <Form.Dropdown.Item key={d.value} title={d.title} value={String(d.value)} />
            ))}
          </Form.Dropdown>

          <Form.TextField id="createdBy" title="Author" placeholder="your name or email" defaultValue={lastAuthor} />
          <Form.TextArea id="comment" title="Comment" placeholder="Reason for silencing..." defaultValue={lastComment} />
        </>
      )}
    </Form>
  );
}
