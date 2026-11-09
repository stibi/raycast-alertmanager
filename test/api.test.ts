import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  createSilence,
  expireSilence,
  fetchAlerts,
  testConnection,
} from "../src/api";
import { instanceA } from "./fixtures";

type FetchArgs = [string, RequestInit & { headers: Record<string, string> }];

const realFetch = globalThis.fetch;
let calls: FetchArgs[] = [];

function respondWith(response: () => Response) {
  globalThis.fetch = (async (...args: FetchArgs) => {
    calls.push(args);
    return response();
  }) as unknown as typeof fetch;
}

function json(body: unknown, status = 200) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: { "Content-Type": "application/json" },
    });
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
  mock.timers.reset();
});

describe("auth headers", () => {
  it("sends no Authorization header without credentials", async () => {
    respondWith(json({}));
    await testConnection(instanceA);
    const [url, init] = calls[0];
    assert.equal(url, "https://am.example.com/api/v2/status");
    assert.equal(init.headers.Authorization, undefined);
  });

  it("sends basic auth when username and password are set", async () => {
    respondWith(json({}));
    await testConnection({ ...instanceA, username: "user", password: "pa:ss" });
    assert.equal(
      calls[0][1].headers.Authorization,
      "Basic " + Buffer.from("user:pa:ss").toString("base64"),
    );
  });
});

describe("fetchAlerts", () => {
  it("requests only unsilenced, uninhibited alerts", async () => {
    respondWith(json([{ labels: { alertname: "X" } }]));
    const alerts = await fetchAlerts(instanceA);
    assert.equal(
      calls[0][0],
      "https://am.example.com/api/v2/alerts?silenced=false&inhibited=false",
    );
    assert.deepEqual(alerts, [{ labels: { alertname: "X" } }]);
  });

  it("throws an error naming the instance on HTTP failure", async () => {
    respondWith(json({}, 503));
    await assert.rejects(fetchAlerts(instanceA), /prod: 503 Error/);
  });
});

describe("createSilence", () => {
  it("posts matchers with a window of the requested duration", async () => {
    mock.timers.enable({
      apis: ["Date"],
      now: new Date("2026-03-01T10:00:00Z"),
    });
    respondWith(json({ silenceID: "s1" }));

    const matchers = [
      { name: "alertname", value: "X", isRegex: false, isEqual: true },
    ];
    const result = await createSilence(instanceA, matchers, 2, "me", "why");

    assert.deepEqual(result, { silenceID: "s1" });
    const [url, init] = calls[0];
    assert.equal(url, "https://am.example.com/api/v2/silences");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(String(init.body)), {
      matchers,
      startsAt: "2026-03-01T10:00:00.000Z",
      endsAt: "2026-03-01T12:00:00.000Z",
      createdBy: "me",
      comment: "why",
    });
  });

  it("includes the response body in the error", async () => {
    respondWith(() => new Response("bad matcher", { status: 400 }));
    await assert.rejects(
      createSilence(instanceA, [], 1, "me", "c"),
      /prod: 400 bad matcher/,
    );
  });
});

describe("expireSilence", () => {
  it("sends DELETE to the silence endpoint", async () => {
    respondWith(() => new Response(null, { status: 200 }));
    await expireSilence(instanceA, "abc");
    const [url, init] = calls[0];
    assert.equal(url, "https://am.example.com/api/v2/silence/abc");
    assert.equal(init.method, "DELETE");
  });
});
