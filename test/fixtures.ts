import { AlertmanagerInstance, AlertWithInstance } from "../src/types";

export const instanceA: AlertmanagerInstance = {
  id: "a",
  name: "prod",
  url: "https://am.example.com",
  username: "",
  password: "",
};

export const instanceB: AlertmanagerInstance = {
  ...instanceA,
  id: "b",
  name: "staging",
  url: "https://am-staging.example.com",
};

export function alert(
  labels: Record<string, string>,
  startsAt = "2026-01-01T00:00:00Z",
  instance: AlertmanagerInstance = instanceA,
): AlertWithInstance {
  return {
    labels,
    annotations: {},
    startsAt,
    endsAt: "2026-01-02T00:00:00Z",
    updatedAt: startsAt,
    fingerprint: JSON.stringify(labels) + startsAt,
    receivers: [{ name: "default" }],
    status: { state: "active", silencedBy: [], inhibitedBy: [] },
    generatorURL: "",
    instance,
  };
}
