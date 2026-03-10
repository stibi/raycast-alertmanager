import { Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { AlertWithInstance, SilenceMatcher } from "./types";
import { createSilence } from "./api";
import { getLastSilenceAuthor, getLastSilenceComment, getLastSilenceDuration } from "./storage";
import { SilenceForm } from "./silence-form";

export function InstantSilenceAction({
  alert,
  onSilenced,
}: {
  alert: AlertWithInstance;
  onSilenced?: () => void;
}) {
  const { push } = useNavigation();

  const handleInstantSilence = useCallback(async () => {
    const [duration, author, comment] = await Promise.all([
      getLastSilenceDuration(),
      getLastSilenceAuthor(),
      getLastSilenceComment(),
    ]);

    if (!author || !comment || !duration) {
      push(<SilenceForm alert={alert} onSilenced={onSilenced} />);
      return;
    }

    try {
      const matchers: SilenceMatcher[] = Object.entries(alert.labels).map(([name, value]) => ({
        name,
        value,
        isRegex: false,
        isEqual: true,
      }));

      await createSilence(alert.instance, matchers, duration, author, comment);
      await showToast(Toast.Style.Success, "Silence Created", `${alert.labels.alertname} on ${alert.instance.name}`);
      onSilenced?.();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed", String(e));
    }
  }, [alert, onSilenced, push]);

  return (
    <Action
      title="Instant Silence"
      icon={Icon.BoltDisabled}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={handleInstantSilence}
    />
  );
}
