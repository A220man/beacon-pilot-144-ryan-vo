import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { evaluationsApi } from "../api/client"
import { useDrift, DriftResult, UseDriftOptions } from "../hooks/useDrift"
import { Card, Table, Badge } from "../components"
import { TrendingUp, AlertTriangle, CheckCircle, MinusCircle } from "lucide-react"

export function DriftPage() {
  const [evaluationId, setEvaluationId] = useState(0)

  // For now, use the first evaluation or a default
  // In a full implementation, this would come from routing/params
  const { data: driftResult, isLoading, isError } = useDrift({
    evaluationId: evaluationId,
  })

  // If no evaluation ID provided, show placeholder
  if (evaluationId === 0) {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Model Drift Detection</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Select an evaluation to analyze drift, or add an evaluation first.
          </p>
        </div>

        <Card>
          <div className="empty-state" style={{ padding: "3rem" }}>
            <TrendingUp size={48} style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }} />
            <h2 style={{ marginBottom: "0.5rem" }}>Select an Evaluation</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
              Choose an evaluation from the list to see drift detection results.
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--color-text-muted)" }}>
              <li>No evaluation selected</li>
            </ul>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Model Drift Detection</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Loading drift analysis…
          </p>
        </div>
        <Card>
          <div style={{ padding: "3rem" }}>Analyzing…</div>
        </Card>
      </div>
    )
  }

  if (isError || !driftResult) {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Model Drift Detection</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Drift analysis failed.
          </p>
        </div>
        <Card>
          <div style={{ padding: "3rem", color: "var(--color-danger)" }}>Could not load drift data. Please try again.</div>
        </Card>
      </div>
    )
  }

  const verdict = driftResult.verdict
  const baselineBand = driftResult.baseline_band
  const currentBand = driftResult.current_band

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Model Drift Detection</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
          Compare model performance across releases using confidence-band methodology
        </p>
      </div>

      <Card>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span>
              <strong>Skill:</strong> {" "}
              {(driftResult as any).skill || "N/A"}
            </span>
            <Badge
              variant={
                verdict === "regression" ? "danger" :
                verdict === "improvement" ? "success" : "neutral"
              }
            >
              {verdict === "regression" && <AlertTriangle size={12} />}
              {verdict === "improvement" && <CheckCircle size={12} />}
              {verdict === "within_noise" && <MinusCircle size={12} />}
              {verdict.replace("_", " ")}
            </Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Baseline Mean</div>
              <div style={{ fontSize: "2rem", fontWeight: 600 }}>{driftResult.baseline_score.toFixed(3)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Current Mean</div>
              <div style={{ fontSize: "2rem", fontWeight: 600 }}>{driftResult.current_score.toFixed(3)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Difference</div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: driftResult.difference < -0.05 ? "var(--color-danger)" : driftResult.difference > 0.05 ? "var(--color-success)" : "var(--color-text-muted)"
              }}>
                {driftResult.difference > 0 ? "+" : ""}{driftResult.difference.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Effect Floor</div>
              <div style={{ fontSize: "2rem", fontWeight: 600 }}>{driftResult.effect_floor}</div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Confidence Bands</div>
            <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Baseline</div>
                <div style={{
                  background: "var(--color-secondary)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  marginTop: "2px",
                  minWidth: "120px"
                }}>
                  [{baselineBand[0].toFixed(3)}, {baselineBand[1].toFixed(3)}]
                </div>
              </div>
              <div style={{ borderLeft: "1px solid var(--color-divider)", paddingLeft: "2rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Current</div>
                <div style={{
                  background: "var(--color-primary)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  marginTop: "2px",
                  minWidth: "120px"
                }}>
                  [{currentBand[0].toFixed(3)}, {currentBand[1].toFixed(3)}]
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: "1.5rem" }}>
        <div style={{ padding: "1.5rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Drift Analysis Details</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            The drift detection algorithm compares confidence bands between the baseline and current evaluation.
            Bands are considered "separate" when they do not overlap (current_low >= baseline_high OR baseline_low >= current_high).
            The difference must also exceed the effect floor (0.05) to be deemed significant.
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            <strong>Verdict:</strong> {driftResult.verdict.replace("_", " ")}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            <strong>Difference:</strong> {driftResult.difference.toFixed(3)} (effect floor: {driftResult.effect_floor})
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            <strong>Significant:</strong> {driftResult.significant ? "yes" : "no"}
          </p>
        </div>
      </Card>
    </div>
  )
}
