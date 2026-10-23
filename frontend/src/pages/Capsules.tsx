import { useState } from "react";
import { useCapsules, useCreateCapsule, useUpdateCapsule, useDeleteCapsule, useCheckCapsule } from "../hooks/useCapsules";
import { Card, Button, Input, Textarea, Badge, Modal, Table } from "../components";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, RefreshCw, Copy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export function CapsulesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCapsule, setEditingCapsule] = useState<any>(null);
  const [formData, setFormData] = useState({
    path: "",
    scope: "",
    evidence: "",
    invalidated_by: "",
    claims: "",
    content: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useCapsules({ page, page_size: 10, status: statusFilter || undefined });
  const createMutation = useCreateCapsule();
  const updateMutation = useUpdateCapsule();
  const deleteMutation = useDeleteCapsule();
  const checkMutation = useCheckCapsule();

  const parseArray = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.path.trim()) setFormErrors({ path: "Path is required" });
    if (!formData.scope.trim()) setFormErrors({ scope: "Scope is required (one per line)" });
    if (!formData.evidence.trim()) setFormErrors({ evidence: "Evidence is required (one per line)" });
    if (!formData.content.trim()) setFormErrors({ content: "Content is required" });

    try {
      const scope = parseArray(formData.scope);
      const evidence = parseArray(formData.evidence);
      const invalidated_by = parseArray(formData.invalidated_by);
      const claims = parseArray(formData.claims).map(line => {
        const [statement, verifier] = line.split("|").map(s => s.trim());
        return { statement: statement || line, verifier: verifier || "" };
      });

      if (editingCapsule) {
        await updateMutation.mutateAsync({
          id: editingCapsule.id,
          data: { scope, evidence, invalidated_by, claims, content: formData.content },
        });
        addToast("success", "Capsule updated");
      } else {
        await createMutation.mutateAsync({
          path: formData.path,
          scope,
          evidence,
          invalidated_by,
          claims,
          content: formData.content,
        });
        addToast("success", "Capsule created");
      }
      setModalOpen(false);
      setEditingCapsule(null);
      resetForm();
      refetch();
    } catch (err: any) {
      addToast("error", err.response?.data?.detail || "Operation failed");
    }
  };

  const handleEdit = (capsule: any) => {
    setEditingCapsule(capsule);
    setFormData({
      path: capsule.path,
      scope: capsule.scope.join("\n"),
      evidence: capsule.evidence.join("\n"),
      invalidated_by: capsule.invalidated_by.join("\n"),
      claims: capsule.claims.map((c: any) => `${c.statement}${c.verifier ? ` | ${c.verifier}` : ""}`).join("\n"),
      content: capsule.content,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this capsule?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      addToast("success", "Capsule deleted");
      refetch();
    } catch (err: any) {
      addToast("error", err.response?.data?.detail || "Delete failed");
    }
  };

  const handleCheck = async (id: number) => {
    try {
      const result = await checkMutation.mutateAsync(id);
      addToast("info", `Capsule state: ${result.state} - ${result.reason || result.error || "OK"}`);
      refetch();
    } catch (err: any) {
      addToast("error", "Check failed");
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    addToast("success", "Path copied");
  };

  const resetForm = () => {
    setFormData({ path: "", scope: "", evidence: "", invalidated_by: "", claims: "", content: "" });
    setFormErrors({});
  };

  const openCreateModal = () => {
    setEditingCapsule(null);
    resetForm();
    setModalOpen(true);
  };

  if (!user || (user.role !== "operator" && user.role !== "admin")) {
    return (
      <Card>
        <div className="empty-state" style={{ padding: "3rem" }}>
          <p>Operator or Admin role required to manage capsules.</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Memory Capsules</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Preserve durable repository knowledge with Git-aware freshness validation
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={18} /> Add Capsule
        </Button>
      </div>

      <Card>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Input
            placeholder="Filter by status..."
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ maxWidth: "200px" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input"
            style={{ maxWidth: "160px" }}
          >
            <option value="">All Status</option>
            <option value="proposed">Proposed</option>
            <option value="verified">Verified</option>
            <option value="stale">Stale</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {isLoading ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="empty-state" style={{ padding: "3rem" }}>
            <p>No capsules found</p>
            <Button variant="primary" size="sm" onClick={openCreateModal} style={{ marginTop: "1rem" }}>
              <Plus size={16} /> Create First Capsule
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: "path", header: "Path", render: (row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <code style={{ fontSize: "0.8rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.path}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyPath(row.path)}>
                      <Copy size={14} />
                    </Button>
                  </div>
                )},
                { key: "status", header: "Status", render: (row) => (
                  <Badge variant={
                    row.status === "verified" ? "success" :
                    row.status === "stale" ? "warning" :
                    row.status === "proposed" ? "info" : "danger"
                  }>{row.status}</Badge>
                )},
                { key: "scope", header: "Scope", render: (row) => (
                  <span style={{ maxWidth: "200px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    {row.scope.join(", ")}
                  </span>
                )},
                { key: "evidence_count", header: "Evidence", render: (row) => row.evidence.length },
                { key: "updated_at", header: "Updated", render: (row) => new Date(row.updated_at).toLocaleDateString() },
                { key: "actions", header: "Actions", render: (row) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="ghost" size="sm" onClick={() => handleCheck(row.id)} disabled={checkMutation.isPending}>
                      <RefreshCw size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )},
              ]}
              data={data?.items ?? []}
              keyAccessor={(row) => row.id}
              emptyMessage="No capsules"
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingCapsule(null); resetForm(); }} title={editingCapsule ? "Edit Capsule" : "Create Capsule"} size="lg">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Path (e.g., src/auth/AGENT_MEMORY.md)"
            value={formData.path}
            onChange={(e) => setFormData({ ...formData, path: e.target.value })}
            error={formErrors.path}
            required
            disabled={!!editingCapsule}
          />
          <Textarea
            label="Scope (one glob per line, e.g., src/auth/**)"
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            error={formErrors.scope}
            required
            rows={3}
          />
          <Textarea
            label="Evidence (one file path per line, optional #symbol)"
            value={formData.evidence}
            onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
            error={formErrors.evidence}
            required
            rows={3}
          />
          <Textarea
            label="Invalidated By (one glob per line, optional)"
            value={formData.invalidated_by}
            onChange={(e) => setFormData({ ...formData, invalidated_by: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Claims (one per line, format: statement | verifier_path)"
            value={formData.claims}
            onChange={(e) => setFormData({ ...formData, claims: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Content (Markdown)"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            error={formErrors.content}
            required
            rows={8}
          />
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); setEditingCapsule(null); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCapsule ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}