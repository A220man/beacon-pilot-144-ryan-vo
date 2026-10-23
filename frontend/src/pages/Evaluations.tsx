import { useState } from "react";
import { useEvaluations, useCreateEvaluation, useRunEvaluation } from "../hooks/useEvaluations";
import { useSkills } from "../hooks/useSkills";
import { Card, Button, Input, Textarea, Badge, Modal, Table } from "../components";
import { Plus, Play, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
export function EvaluationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<string | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ skill_id: "", model_name: "", model_version: "", input_data: '{"n_runs": 5}' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useEvaluations({ page, page_size: 10, skill_id: skillFilter || undefined, status: statusFilter || undefined });
  const { data: skillsData } = useSkills({ page_size: 100 });
  const createMutation = useCreateEvaluation();
  const runMutation = useRunEvaluation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.skill_id) setFormErrors({ skill_id: "Skill is required" });
    if (!formData.model_name.trim()) setFormErrors({ model_name: "Model name is required" });
    if (!formData.model_version.trim()) setFormErrors({ model_version: "Model version is required" });
    if (Object.keys(formErrors).length > 0) return;

    try {
      await createMutation.mutateAsync({
        skill_id: parseInt(formData.skill_id),
        model_name: formData.model_name,
        model_version: formData.model_version,
        input_data: formData.input_data,
      });
      addToast("success", "Evaluation created");
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      addToast("error", err.response?.data?.detail || "Create failed");
    }
  };

  const handleRun = async (id: number) => {
    try {
      await runMutation.mutateAsync(id);
      addToast("success", "Evaluation started");
      refetch();
    } catch (err: any) {
      addToast("error", err.response?.data?.detail || "Run failed");
    }
  };

  const handleDelete = async (_id: number) => {
    if (!confirm("Delete this evaluation?")) return;
    try {
      // Note: no delete endpoint yet, would need backend
      addToast("warning", "Delete not implemented yet");
    } catch {
      addToast("error", "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({ skill_id: "", model_name: "", model_version: "", input_data: '{"n_runs": 5}' });
    setFormErrors({});
  };

  if (!user || (user.role !== "operator" && user.role !== "admin")) {
    return (
      <Card>
        <div className="empty-state" style={{ padding: "3rem" }}>
          <p>Operator or Admin role required to manage evaluations.</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Evaluations</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Run deterministic evaluations with confidence bands
          </p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus size={18} /> Create Evaluation
        </Button>
      </div>

      <Card>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: "300px" }}
          />
          <select
            value={skillFilter}
            onChange={(e) => { setSkillFilter(e.target.value === "" ? "" : parseInt(e.target.value)); setPage(1); }}
            className="input"
            style={{ maxWidth: "200px" }}
          >
            <option value="">All Skills</option>
            {skillsData?.items.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input"
            style={{ maxWidth: "160px" }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="empty-state" style={{ padding: "3rem" }}>
            <p>No evaluations found</p>
            <Button variant="primary" size="sm" onClick={() => { resetForm(); setModalOpen(true); }} style={{ marginTop: "1rem" }}>
              <Plus size={16} /> Create First Evaluation
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: "model", header: "Model", render: (row) => <strong>{row.model_name} v{row.model_version}</strong> },
                { key: "skill", header: "Skill", render: (row) => skillsData?.items.find(s => s.id === row.skill_id)?.name ?? `ID: ${row.skill_id}` },
                { key: "status", header: "Status", render: (row) => (
                  <Badge variant={
                    row.status === "completed" ? "success" :
                    row.status === "running" ? "info" :
                    row.status === "failed" ? "danger" : "warning"
                  }>{row.status}</Badge>
                )},
                { key: "score", header: "Score", render: (row) => row.score !== null ? (
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {row.score.toFixed(3)} ({row.confidence_low?.toFixed(3)}–{row.confidence_high?.toFixed(3)})
                  </span>
                ) : "—" },
                { key: "started_at", header: "Started", render: (row) => row.started_at ? new Date(row.started_at).toLocaleString() : "—" },
                { key: "completed_at", header: "Completed", render: (row) => row.completed_at ? new Date(row.completed_at).toLocaleString() : "—" },
                { key: "actions", header: "Actions", render: (row) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {row.status === "pending" || row.status === "failed" ? (
                      <Button variant="primary" size="sm" onClick={() => handleRun(row.id)} disabled={runMutation.isPending}>
                        <Play size={16} /> Run
                      </Button>
                    ) : (
                      <Badge variant="neutral">{row.status}</Badge>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/evaluations/${row.id}`}><Eye size={16} /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )},
              ]}
              data={data?.items ?? []}
              keyAccessor={(row) => row.id}
              emptyMessage="No evaluations"
            />

            {data && data.total > data.page_size && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={18} />
                </Button>
                <span>Page {page} of {Math.ceil(data.total / data.page_size)}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(data.total / data.page_size), p + 1))} disabled={page >= Math.ceil(data.total / data.page_size)}>
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Create Evaluation" size="lg">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <select
            value={formData.skill_id}
            onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
            className="input"
            required
          >
            <option value="">Select Skill</option>
            {skillsData?.items.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
            ))}
          </select>
          <Input
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, model_name: e.target.value })}
            error={formErrors.model_name}
            required
            placeholder="e.g., claude-opus-5, gpt-4o"
          />
          <Input
            label="Model Version"
            value={formData.model_version}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, model_version: e.target.value })}
            error={formErrors.model_version}
            required
            placeholder="e.g., 20241022"
          />
          <Textarea
            label="Input Data (JSON)"
            value={formData.input_data}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, input_data: e.target.value })}
            rows={6}
            helperText='Example: {"n_runs": 5, "difficulty": "high", "adversarial": false}'
          />
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}