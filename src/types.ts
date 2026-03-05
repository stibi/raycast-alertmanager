export interface AlertmanagerInstance {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
}

export interface Alert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  fingerprint: string;
  receivers: { name: string }[];
  status: {
    state: "active" | "suppressed" | "unprocessed";
    silencedBy: string[];
    inhibitedBy: string[];
  };
  generatorURL: string;
}

export interface AlertWithInstance extends Alert {
  instance: AlertmanagerInstance;
}

export interface Silence {
  id: string;
  matchers: SilenceMatcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
  status: {
    state: "active" | "pending" | "expired";
  };
}

export interface SilenceMatcher {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
}

export const SILENCE_DURATIONS = [
  { title: "1 hour", value: 1 },
  { title: "2 hours", value: 2 },
  { title: "4 hours", value: 4 },
  { title: "8 hours", value: 8 },
  { title: "24 hours", value: 24 },
  { title: "3 days", value: 72 },
  { title: "7 days", value: 168 },
] as const;
