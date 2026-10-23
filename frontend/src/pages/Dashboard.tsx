import { useSkills } from "../hooks/useSkills";
import { useEvaluations } from "../hooks/useEvaluations";
import { useCapsules } from "../hooks/useCapsules";
import { Card, Badge, Button } from "../components";
import { TrendingUp, Brain, GitBranch, FileText, Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { data: skillsData, isLoading: skillsLoading } = useSkills({ page_size: 5 });
  const { data: evalsData, isLoading: evalsLoading } = useEvaluations({ page_size: 5 });
  const { data: capsulesData, isLoading: capsulesLoading } = useCapsules({ page_size: 5 });
  // Suppress unused warnings (used in JSX conditionals below)
  void skillsLoading;
  void capsulesLoading;
  const stats = [
    { label: "Skills", value: skillsData?.total ?? 0, icon: Brain, color: "var(--color-primary)", href: "/skills" },
    { label: "Evaluations", value: evalsData?.total ?? 0, icon: GitBranch, color: "var(--color-info)", href: "/evaluations" },
    { label: "Memory Capsules", value: capsulesData?.total ?? 0, icon: FileText, color: "var(--color-success)", href: "/capsules" },
    { label: "Verified Capsules", value: capsulesData?.items.filter(c => c.status === "verified").length ?? 0, icon: TrendingUp, color: "var(--color-warning)", href: "/capsules" },
  ];

  const recentEvaluations = evalsData?.items.slice(0, 5) ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Production-grade skill evaluation and drift detection for AI coding agents
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href} style={{ textDecoration: "none" }}>
              <Card style={{ transition: "transform var(--transition), box-shadow var(--transition)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                      {stat.label}
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stat.value}</p>
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--radius-md)",
                      backgroundColor: `${stat.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={24} style={{ color: stat.color }} />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Recent Evaluations</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/evaluations">View All</Link>
            </Button>
          </div>
          {evalsLoading ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : recentEvaluations.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <p>No evaluations yet</p>
              <Button variant="primary" size="sm" asChild style={{ marginTop: "1rem" }}>
                <Link to="/evaluations">Create Evaluation <Plus size={16} /></Link>
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {recentEvaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    backgroundColor: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                    <Badge variant={evaluation.status === "completed" ? "success" : evaluation.status === "running" ? "info" : evaluation.status === "failed" ? "danger" : "warning"}>
                      {evaluation.status}
                    </Badge>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {evaluation.model_name} v{evaluation.model_version}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        Skill ID: {evaluation.skill_id} &bull; {new Date(evaluation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {evaluation.score !== null && (
                      <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {evaluation.score.toFixed(2)}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/evaluations/${evaluation.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Quick Actions</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <Button variant="secondary" asChild style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem", padding: "1rem" }}>
              <Link to="/skills">
                <Brain size={28} style={{ color: "var(--color-primary)" }} />
                <span style={{ fontWeight: 500 }}>Create Skill</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Define evaluation schema</span>
              </Link>
            </Button>
            <Button variant="secondary" asChild style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem", padding: "1rem" }}>
              <Link to="/evaluations">
                <Play size={28} style={{ color: "var(--color-info)" }} />
                <span style={{ fontWeight: 500 }}>Run Evaluation</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Test model performance</span>
              </Link>
            </Button>
            <Button variant="secondary" asChild style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem", padding: "1rem" }}>
              <Link to="/capsules">
                <FileText size={28} style={{ color: "var(--color-success)" }} />
                <span style={{ fontWeight: 500 }}>Add Memory Capsule</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Preserve repo knowledge</span>
              </Link>
            </Button>
            <Button variant="secondary" asChild style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem", padding: "1rem" }}>
              <Link to="/drift">
                <TrendingUp size={28} style={{ color: "var(--color-warning)" }} />
                <span style={{ fontWeight: 500 }}>Check Drift</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Compare model versions</span>
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}