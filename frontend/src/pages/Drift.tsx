import { Card, Table } from "../components";
import { TrendingUp, AlertTriangle, CheckCircle, MinusCircle } from "lucide-react";
import { Badge } from "../components";
export function DriftPage() {
  // Placeholder - will be implemented with drift detection feature
  const mockDriftData = [
    { skill: "code-review-and-quality", baseline: "0.82", current: "0.81", diff: -0.01, verdict: "within_noise" },
    { skill: "git-workflow-and-versioning", baseline: "0.79", current: "0.73", diff: -0.06, verdict: "regression" },
    { skill: "documentation-and-adrs", baseline: "0.75", current: "0.78", diff: 0.03, verdict: "within_noise" },
    { skill: "test-driven-development", baseline: "0.88", current: "0.85", diff: -0.03, verdict: "within_noise" },
    { skill: "security-and-hardening", baseline: "0.80", current: "0.84", diff: 0.04, verdict: "improvement" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Model Drift Detection</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
          Compare model performance across releases using confidence-band methodology
        </p>
      </div>

      <Card>
        <div className="empty-state" style={{ padding: "3rem" }}>
          <TrendingUp size={48} style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }} />
          <h2 style={{ marginBottom: "0.5rem" }}>Drift Detection Coming Soon</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            This feature will implement the driftproof methodology: 5x sampled runs, confidence bands,
            and regression detection requiring band separation + 0.05 effect floor.
          </p>
          <div style={{ maxWidth: "600px", textAlign: "left" }}>
            <h3 style={{ marginBottom: "1rem" }}>Planned Implementation:</h3>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--color-text-muted)" }}>
              <li>✓ Deterministic evaluation runner with confidence bands (done)</li>
              <li>☐ Historical result storage and comparison API</li>
              <li>☐ Drift detection algorithm (bands separate + effect floor)</li>
              <li>☐ Visualization of drift trends over time</li>
              <li>☐ Automated regression alerts</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Preview: Drift Report Format</h2>
        <Table
          columns={[
            { key: "skill", header: "Skill", render: (row) => <strong>{row.skill}</strong> },
            { key: "baseline", header: "Baseline Score" },
            { key: "current", header: "Current Score" },
            { key: "diff", header: "Difference", render: (row) => (
              <span style={{ 
                fontFamily: "var(--font-mono)", 
                fontWeight: 600,
                color: row.diff < -0.05 ? "var(--color-danger)" : row.diff > 0.05 ? "var(--color-success)" : "var(--color-text-muted)"
              }}>
                {row.diff > 0 ? "+" : ""}{row.diff.toFixed(2)}
              </span>
            )},
            { key: "verdict", header: "Verdict", render: (row) => (
              <Badge variant={
                row.verdict === "regression" ? "danger" :
                row.verdict === "improvement" ? "success" : "neutral"
              }>
                {row.verdict === "regression" && <AlertTriangle size={12} />}
                {row.verdict === "improvement" && <CheckCircle size={12} />}
                {row.verdict === "within_noise" && <MinusCircle size={12} />}
                {row.verdict.replace("_", " ")}
              </Badge>
            )},
          ]}
          data={mockDriftData}
          keyAccessor={(row) => row.skill}
          emptyMessage="No drift data"
        />
      </Card>
    </div>
  );
}