import {
  Action,
  ActionPanel,
  Alert as RaycastAlert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AlertmanagerInstance } from "./types";
import { addInstance, getInstances, removeInstance, updateInstance } from "./storage";
import { testConnection } from "./api";
import { randomUUID } from "crypto";

export default function ManageInstances() {
  const [instances, setInstances] = useState<AlertmanagerInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadInstances() {
    setIsLoading(true);
    setInstances(await getInstances());
    setIsLoading(false);
  }

  useEffect(() => {
    loadInstances();
  }, []);

  async function handleDelete(instance: AlertmanagerInstance) {
    if (
      await confirmAlert({
        title: "Remove Instance",
        message: `Remove "${instance.name}"?`,
        primaryAction: { title: "Remove", style: RaycastAlert.ActionStyle.Destructive },
      })
    ) {
      await removeInstance(instance.id);
      await showToast(Toast.Style.Success, "Removed", instance.name);
      await loadInstances();
    }
  }

  return (
    <List isLoading={isLoading}>
      {instances.map((instance) => (
        <List.Item
          key={instance.id}
          title={instance.name}
          subtitle={instance.url}
          accessories={[instance.username ? { tag: "auth", icon: Icon.Lock } : { tag: "no auth", icon: Icon.LockUnlocked }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Instance"
                icon={Icon.Pencil}
                target={<InstanceForm instance={instance} onSave={loadInstances} />}
              />
              <Action
                title="Remove Instance"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(instance)}
              />
              <Action.Push
                title="Add Instance"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<InstanceForm onSave={loadInstances} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Add Instance..."
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Instance"
              icon={Icon.Plus}
              target={<InstanceForm onSave={loadInstances} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function InstanceForm({ instance, onSave }: { instance?: AlertmanagerInstance; onSave: () => void }) {
  const { pop } = useNavigation();
  const [validated, setValidated] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  async function handleTest(values: { name: string; url: string; username: string; password: string }) {
    if (!values.url.trim()) {
      await showToast(Toast.Style.Failure, "URL is required");
      return;
    }

    setIsTesting(true);
    try {
      const url = values.url.replace(/\/+$/, "");
      await testConnection({ id: "", name: "", url, username: values.username, password: values.password });
      setValidated(true);
      await showToast(Toast.Style.Success, "Connection Successful");
    } catch (e) {
      setValidated(false);
      await showToast(Toast.Style.Failure, "Connection Failed", String(e));
    }
    setIsTesting(false);
  }

  async function handleSubmit(values: { name: string; url: string; username: string; password: string }) {
    if (!values.name.trim() || !values.url.trim()) {
      await showToast(Toast.Style.Failure, "Name and URL are required");
      return;
    }

    if (!validated) {
      await showToast(Toast.Style.Failure, "Test the connection first");
      return;
    }

    const url = values.url.replace(/\/+$/, "");

    if (instance) {
      await updateInstance({ ...instance, name: values.name, url, username: values.username, password: values.password });
      await showToast(Toast.Style.Success, "Updated", values.name);
    } else {
      await addInstance({ id: randomUUID(), name: values.name, url, username: values.username, password: values.password });
      await showToast(Toast.Style.Success, "Added", values.name);
    }
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={instance ? "Edit Instance" : "Add Instance"}
      isLoading={isTesting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Test Connection" icon={Icon.Wifi} onSubmit={handleTest} />
          {validated && (
            <Action.SubmitForm title={instance ? "Save" : "Add"} icon={Icon.Check} onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Production" defaultValue={instance?.name ?? ""} />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://alertmanager.example.com"
        defaultValue={instance?.url ?? ""}
        onChange={() => setValidated(false)}
      />
      <Form.Separator />
      <Form.TextField
        id="username"
        title="Username"
        placeholder="optional"
        defaultValue={instance?.username ?? ""}
        onChange={() => setValidated(false)}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="optional"
        defaultValue={instance?.password ?? ""}
        onChange={() => setValidated(false)}
      />
      <Form.Separator />
      <Form.Description text={validated ? "✅ Connection verified" : "⚠️ Test the connection before saving"} />
    </Form>
  );
}
