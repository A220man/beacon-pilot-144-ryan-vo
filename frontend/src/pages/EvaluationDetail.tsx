import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useEvaluation } from "../hooks/useEvaluations";
import { useAuth } from "../hooks/useAuth";
import { Card, Button, Badge } from "../components";
import { ChevronLeft, RefreshCw, BarChart2, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export function EvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const evaluationId = Number(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: evaluation, isLoading, error, refetch } = useEvaluation(evaluationId);

  useEffect(() => {
    if (evaluation?.status === "running") {
      const interval = setInterval(() => {
        setRefreshKey((k) => k + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [evaluation?.status]);

  // Trigger refetch when refreshKey changes
  useEffect(() => {
    if (evaluationId) {
      refetch();
    }
  }, [evaluationId, refetch, refreshKey]);

  if (!user || (user.role !== "operator" && user.role !== "admin")) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Card>
          <div style={{ textAlign: "center", padding: 24 }}>
            <h2>Access Denied</h2>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
              Operator or Admin role required.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Card>
          <div style={{ textAlign: "center", padding: 24 }}>
            <h2>Evaluation Not Found</h2>
            <Button variant="secondary" onClick={() => window.history.back()} style={{ marginTop: 16 }}>
              <ChevronLeft size={16} style={{ marginRight: 4 }} />
              Back to Evaluations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success"><CheckCircle size={12} style={{ marginRight: 4 }} /> Completed</Badge>;
      case "running":
        return <Badge variant="info"><Clock size={12} style={{ marginRight: 4, animation: "spin 1s linear infinite" }} /> Running</Badge>;
      case "failed":
        return <Badge variant="danger"><XCircle size={12} style={{ marginRight: 4 }} /> Failed</Badge>;
      default:
        return <Badge variant="neutral"><Clock size={12} style={{ marginRight: 4 }} /> Pending</Badge>;
    }
  };

  const parseResultData = () => {
    if (!evaluation.result_data) return null;
    try {
      return JSON.parse(evaluation.result_data);
    } catch {
      return null;
    }
  };

  const resultData = parseResultData();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <Link to="/evaluations" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ChevronLeft size={20} />
            Back to Evaluations
          </Link>
          <h1 style={{ margin: 0, fontSize: 28 }}>{evaluation.model_name} v{evaluation.model_version}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {getStatusBadge(evaluation.status)}
          {evaluation.status === "running" && (
            <Button variant="secondary" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw size={16} style={{ marginRight: 4, animation: "spin 1s linear infinite" }} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--color-primary-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={20} style={{ color: "var(--color-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Score</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: evaluation.score !== null ? "var(--color-text)" : "var(--color-text-muted)" }}>
                {evaluation.score !== null ? (evaluation.score * 100).toFixed(1) + "%" : "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--color-info-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} style={{ color: "var(--color-info)" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Confidence Band</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {evaluation.confidence_low !== null && evaluation.confidence_high !== null
                  ? `[( ${(evaluation.confidence_low * 100).toFixed(1)}%, ${(evaluation.confidence_high * 100).toFixed(1)}% )]`
                  : "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--color-warning-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} style={{ color: "var(--color-warning)" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Duration</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {evaluation.started_at && evaluation.completed_at
                  ? `${((new Date(evaluation.completed_at).getTime() - new Date(evaluation.started_at).getTime()) / 1000).toFixed(1)}s`
                  : evaluation.started_at
                  ? "Running..."
                  : "—"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Configuration</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Model</div>
              <div style={{ fontWeight: 500 }}>{evaluation.model_name} v{evaluation.model_version}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Skill ID</div>
              <div style={{ fontWeight: 500 }}>{evaluation.skill_id}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Input Data</div>
              <pre style={{ background: "var(--color-code-bg)", padding: 12, borderRadius: 6, overflow: "auto", fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
                {evaluation.input_data}
              </pre>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Timestamps</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Created</div>
              <div style={{ fontWeight: 500 }}>{format(new Date(evaluation.created_at), "PPpp")}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Started</div>
              <div style={{ fontWeight: 500 }}>{evaluation.started_at ? format(new Date(evaluation.started_at), "PPpp") : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Completed</div>
              <div style={{ fontWeight: 500 }}>{evaluation.completed_at ? format(new Date(evaluation.completed_at), "PPpp") : "—"}</div>
            </div>
            {evaluation.error_message && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Error</div>
                <div style={{ color: "var(--color-danger)", fontSize: 14 }}>{evaluation.error_message}</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {resultData && (
        <Card>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Evaluation Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Number of Runs</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{resultData.n_runs || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Effect Floor</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{(resultData.effect_floor * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Drift Verdict</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>{resultData.drift_verdict || "—"}</div>
            </div>
          </div>

          {resultData.scores && resultData.scores.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>Individual Run Scores</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {resultData.scores.map((score: number, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: "var(--color-code-bg)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Run {idx + 1}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{(score * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultData.baseline_comparison && (
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>Baseline Comparison</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Baseline Score</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{(resultData.baseline_comparison.baseline_score * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Current Score</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{(resultData.baseline_comparison.current_score * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Difference</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: resultData.baseline_comparison.difference > 0 ? "var(--color-success)" : resultData.baseline_comparison.difference < 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                    {(resultData.baseline_comparison.difference * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Significant</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{resultData.baseline_comparison.significant ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {!resultData && evaluation.status === "completed" && (
        <Card style={{ background: "var(--color-warning-bg)", borderColor: "var(--color-warning)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={20} style={{ color: "var(--color-warning)" }} />
            <span>Evaluation completed but no result data available.</span>
          </div>
        </Card>
      )}

      {evaluation.status === "failed" && evaluation.error_message && (
        <Card style={{ background: "var(--color-danger-bg)", borderColor: "var(--color-danger)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <XCircle size={20} style={{ color: "var(--color-danger)" }} />
            <span>Evaluation failed: {evaluation.error_message}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
