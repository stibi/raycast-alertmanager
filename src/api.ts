import fetch from "node-fetch";
import { Alert, AlertmanagerInstance, Silence, SilenceMatcher } from "./types";

function headers(instance: AlertmanagerInstance): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (instance.username && instance.password) {
    h["Authorization"] = "Basic " + Buffer.from(`${instance.username}:${instance.password}`).toString("base64");
  }
  return h;
}

export async function testConnection(instance: AlertmanagerInstance): Promise<void> {
  const response = await fetch(`${instance.url}/api/v2/status`, {
    headers: headers(instance),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

export async function fetchAlerts(instance: AlertmanagerInstance): Promise<Alert[]> {
  const response = await fetch(`${instance.url}/api/v2/alerts?silenced=false&inhibited=false`, {
    headers: headers(instance),
  });
  if (!response.ok) {
    throw new Error(`${instance.name}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Alert[];
}

export async function fetchAllAlerts(instance: AlertmanagerInstance): Promise<Alert[]> {
  const response = await fetch(`${instance.url}/api/v2/alerts`, {
    headers: headers(instance),
  });
  if (!response.ok) {
    throw new Error(`${instance.name}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Alert[];
}

export async function createSilence(
  instance: AlertmanagerInstance,
  matchers: SilenceMatcher[],
  durationHours: number,
  createdBy: string,
  comment: string,
): Promise<{ silenceID: string }> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const body = {
    matchers,
    startsAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    createdBy,
    comment,
  };

  const response = await fetch(`${instance.url}/api/v2/silences`, {
    method: "POST",
    headers: headers(instance),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${instance.name}: ${response.status} ${text}`);
  }
  return (await response.json()) as { silenceID: string };
}

export async function fetchSilences(instance: AlertmanagerInstance): Promise<Silence[]> {
  const response = await fetch(`${instance.url}/api/v2/silences`, {
    headers: headers(instance),
  });
  if (!response.ok) {
    throw new Error(`${instance.name}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Silence[];
}

export async function expireSilence(instance: AlertmanagerInstance, silenceId: string): Promise<void> {
  const response = await fetch(`${instance.url}/api/v2/silence/${silenceId}`, {
    method: "DELETE",
    headers: headers(instance),
  });
  if (!response.ok) {
    throw new Error(`${instance.name}: ${response.status} ${response.statusText}`);
  }
}
