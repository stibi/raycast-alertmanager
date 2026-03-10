import { LocalStorage } from "@raycast/api";
import { AlertmanagerInstance } from "./types";

const INSTANCES_KEY = "alertmanager-instances";
const LAST_SILENCE_DURATION_KEY = "last-silence-duration";
const LAST_SILENCE_AUTHOR_KEY = "last-silence-author";
const LAST_SILENCE_COMMENT_KEY = "last-silence-comment";

export async function getInstances(): Promise<AlertmanagerInstance[]> {
  const json = await LocalStorage.getItem<string>(INSTANCES_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveInstances(instances: AlertmanagerInstance[]): Promise<void> {
  await LocalStorage.setItem(INSTANCES_KEY, JSON.stringify(instances));
}

export async function addInstance(instance: AlertmanagerInstance): Promise<void> {
  const instances = await getInstances();
  instances.push(instance);
  await saveInstances(instances);
}

export async function updateInstance(instance: AlertmanagerInstance): Promise<void> {
  const instances = await getInstances();
  const index = instances.findIndex((i) => i.id === instance.id);
  if (index >= 0) {
    instances[index] = instance;
    await saveInstances(instances);
  }
}

export async function removeInstance(id: string): Promise<void> {
  const instances = await getInstances();
  await saveInstances(instances.filter((i) => i.id !== id));
}

export async function getLastSilenceDuration(): Promise<number> {
  const value = await LocalStorage.getItem<number>(LAST_SILENCE_DURATION_KEY);
  return value ?? 2;
}

export async function setLastSilenceDuration(hours: number): Promise<void> {
  await LocalStorage.setItem(LAST_SILENCE_DURATION_KEY, hours);
}

export async function getLastSilenceAuthor(): Promise<string> {
  return (await LocalStorage.getItem<string>(LAST_SILENCE_AUTHOR_KEY)) ?? "";
}

export async function setLastSilenceAuthor(author: string): Promise<void> {
  await LocalStorage.setItem(LAST_SILENCE_AUTHOR_KEY, author);
}

export async function getLastSilenceComment(): Promise<string> {
  return (await LocalStorage.getItem<string>(LAST_SILENCE_COMMENT_KEY)) ?? "";
}

export async function setLastSilenceComment(comment: string): Promise<void> {
  await LocalStorage.setItem(LAST_SILENCE_COMMENT_KEY, comment);
}
