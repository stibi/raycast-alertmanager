import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertWithInstance, SILENCE_DURATIONS, SilenceMatcher } from "./types";
import { createSilence } from "./api";
import { getLastSilenceAuthor, getLastSilenceComment, getLastSilenceDuration, setLastSilenceAuthor, setLastSilenceComment, setLastSilenceDuration } from "./storage";

export function SilenceForm({ alert, onSilenced }: { alert: AlertWithInstance; onSilenced?: () => void }) {
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

  const defaultMatchers = Object.entries(alert.labels).map(([name, value]) => ({
    name,
    value,
    isRegex: false,
    isEqual: true,
  }));

  async function handleSubmit(values: { duration: string; createdBy: string; comment: string; matchers: string[] }) {
    if (!values.comment.trim()) {
      await showToast(Toast.Style.Failure, "Comment is required");
      return;
    }
    if (!values.createdBy.trim()) {
      await showToast(Toast.Style.Failure, "Author is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMatchers: SilenceMatcher[] = defaultMatchers.filter((_, i) =>
        values.matchers.includes(String(i)),
      );

      if (selectedMatchers.length === 0) {
        await showToast(Toast.Style.Failure, "Select at least one matcher");
        setIsSubmitting(false);
        return;
      }

      const durationHours = Number(values.duration);
      await createSilence(alert.instance, selectedMatchers, durationHours, values.createdBy, values.comment);
      await Promise.all([
        setLastSilenceDuration(durationHours),
        setLastSilenceAuthor(values.createdBy),
        setLastSilenceComment(values.comment),
      ]);
      await showToast(Toast.Style.Success, "Silence Created", `${alert.labels.alertname} on ${alert.instance.name}`);
      onSilenced?.();
      pop();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed", String(e));
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      navigationTitle={`Silence: ${alert.labels.alertname}`}
      isLoading={isSubmitting || !isLoaded}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Silence" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isLoaded && (
        <>
          <Form.Description title="Alert" text={`${alert.labels.alertname} (${alert.instance.name})`} />

          <Form.TagPicker
            id="matchers"
            title="Match Labels"
            defaultValue={defaultMatchers.map((_, i) => String(i))}
          >
            {defaultMatchers.map((m, i) => (
              <Form.TagPicker.Item key={i} value={String(i)} title={`${m.name}="${m.value}"`} />
            ))}
          </Form.TagPicker>

          <Form.Dropdown id="duration" title="Duration" defaultValue={lastDuration}>
            {SILENCE_DURATIONS.map((d) => (
              <Form.Dropdown.Item key={d.value} title={d.title} value={String(d.value)} />
            ))}
          </Form.Dropdown>

          <Form.TextField id="createdBy" title="Author" placeholder="your name or email" defaultValue={lastAuthor} />
          <Form.TextArea id="comment" title="Comment" placeholder="Reason for silencing this alert..." defaultValue={lastComment} />
        </>
      )}
    </Form>
  );
}
