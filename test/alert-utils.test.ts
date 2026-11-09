import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectUniqueInstances,
  collectUniqueLabels,
  escapeXml,
  groupByAlertname,
  highestSeverityOf,
  sortAlerts,
} from "../src/alert-utils";
import { alert, instanceA, instanceB } from "./fixtures";

const names = (alerts: { labels: Record<string, string> }[]) =>
  alerts.map((a) => a.labels.alertname);

describe("sortAlerts", () => {
  const old = alert(
    { alertname: "Old", severity: "warning" },
    "2026-01-01T00:00:00Z",
  );
  const fresh = alert(
    { alertname: "Fresh", severity: "warning" },
    "2026-01-03T00:00:00Z",
  );
  const crit = alert(
    { alertname: "Crit", severity: "critical" },
    "2026-01-02T00:00:00Z",
  );
  const none = alert({ alertname: "NoSeverity" }, "2026-01-04T00:00:00Z");
  const odd = alert(
    { alertname: "Odd", severity: "page" },
    "2026-01-05T00:00:00Z",
  );
  const all = [old, none, fresh, odd, crit];

  it("orders by severity, then newest first within a severity", () => {
    assert.deepEqual(names(sortAlerts(all, "severity")), [
      "Crit",
      "Fresh",
      "Old",
      "Odd",
      "NoSeverity",
    ]);
  });

  it("treats critical (rank 0) as more severe than unknown severities", () => {
    assert.deepEqual(names(sortAlerts([none, crit], "severity")), [
      "Crit",
      "NoSeverity",
    ]);
  });

  it("orders by age in both directions", () => {
    assert.deepEqual(names(sortAlerts(all, "age-desc")), [
      "Odd",
      "NoSeverity",
      "Fresh",
      "Crit",
      "Old",
    ]);
    assert.deepEqual(names(sortAlerts(all, "age-asc")), [
      "Old",
      "Crit",
      "Fresh",
      "NoSeverity",
      "Odd",
    ]);
  });

  it("orders by alertname", () => {
    assert.deepEqual(names(sortAlerts(all, "alertname")), [
      "Crit",
      "Fresh",
      "NoSeverity",
      "Odd",
      "Old",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [old, crit];
    sortAlerts(input, "severity");
    assert.deepEqual(input, [old, crit]);
  });
});

describe("groupByAlertname", () => {
  it("groups by alertname in order of first occurrence", () => {
    const a1 = alert({ alertname: "B", pod: "1" });
    const a2 = alert({ alertname: "A" });
    const a3 = alert({ alertname: "B", pod: "2" });
    const a4 = alert({});
    assert.deepEqual(groupByAlertname([a1, a2, a3, a4]), [
      { alertname: "B", alerts: [a1, a3] },
      { alertname: "A", alerts: [a2] },
      { alertname: "Unknown Alert", alerts: [a4] },
    ]);
  });
});

describe("highestSeverityOf", () => {
  it("returns the most severe label in the group", () => {
    assert.equal(
      highestSeverityOf([
        alert({ severity: "info" }),
        alert({ severity: "critical" }),
        alert({ severity: "warning" }),
      ]),
      "critical",
    );
  });

  it("falls back to the first alert's severity, or empty", () => {
    assert.equal(
      highestSeverityOf([alert({ severity: "page" }), alert({})]),
      "page",
    );
    assert.equal(highestSeverityOf([alert({})]), "");
    assert.equal(highestSeverityOf([]), "");
  });
});

describe("escapeXml", () => {
  it("escapes all XML special characters", () => {
    assert.equal(
      escapeXml(`<a href="x">Tom & Jerry's</a>`),
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;",
    );
  });
});

describe("collectUniqueLabels", () => {
  it("returns unique key=value pairs sorted by id", () => {
    const labels = collectUniqueLabels([
      alert({ alertname: "X", severity: "warning" }),
      alert({ alertname: "X", severity: "critical" }),
    ]);
    assert.deepEqual(
      labels.map((l) => l.id),
      ["alertname=X", "severity=critical", "severity=warning"],
    );
    assert.deepEqual(labels[0], {
      key: "alertname",
      value: "X",
      id: "alertname=X",
    });
  });
});

describe("collectUniqueInstances", () => {
  it("dedupes instances by id, keeping first-seen order", () => {
    assert.deepEqual(
      collectUniqueInstances([
        alert({}, undefined, instanceB),
        alert({}, undefined, instanceA),
        alert({}, undefined, instanceB),
      ]),
      [instanceB, instanceA],
    );
  });
});
