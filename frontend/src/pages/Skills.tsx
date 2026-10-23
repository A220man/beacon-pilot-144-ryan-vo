import { useState } from "react";
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from "../hooks/useSkills";
import { Card, Button, Input, Textarea, Modal, Table } from "../components";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import type { Skill } from "../types/api";

export function SkillsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", description: "", schema_json: "{}", version: "1.0.0" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useSkills({ page, page_size: 10, search });
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();
  const deleteMutation = useDeleteSkill();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.name.trim()) setFormErrors({ name: "Name is required" });
    if (!formData.slug.trim()) setFormErrors({ slug: "Slug is required" });
    if (!formData.description.trim()) setFormErrors({ description: "Description is required" });
    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      setFormErrors({ slug: "Slug must be lowercase alphanumeric with hyphens" });
    }
    if (Object.keys(formErrors).length > 0) return;

    try {
      if (editingSkill) {
        await updateMutation.mutateAsync({ id: editingSkill.id, data: formData });
        addToast("success", "Skill updated");
      } else {
        await createMutation.mutateAsync(formData);
        addToast("success", "Skill created");
      }
      setModalOpen(false);
      setEditingSkill(null);
      resetForm();
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Operation failed";
      addToast("error", msg);
      if (msg.includes("Slug")) setFormErrors({ slug: msg });
    }
  };

  const handleEdit = (skill: any) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      schema_json: skill.schema_json,
      version: skill.version,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this skill?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      addToast("success", "Skill deleted");
      refetch();
    } catch (err: any) {
      addToast("error", err.response?.data?.detail || "Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", schema_json: "{}", version: "1.0.0" });
    setFormErrors({});
  };

  const openCreateModal = () => {
    setEditingSkill(null);
    resetForm();
    setModalOpen(true);
  };

  if (!user || (user.role !== "operator" && user.role !== "admin")) {
    return (
      <Card>
        <div className="empty-state" style={{ padding: "3rem" }}>
          <p>Operator or Admin role required to manage skills.</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Skills</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Define evaluation schemas for AI coding agent skills
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={18} /> Create Skill
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: "1rem" }}>
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: "300px" }}
          />
        </div>

        {isLoading ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="empty-state" style={{ padding: "3rem" }}>
            <p>No skills found</p>
            <Button variant="primary" size="sm" onClick={openCreateModal} style={{ marginTop: "1rem" }}>
              <Plus size={16} /> Create First Skill
            </Button>
          </div>
        ) : (
          <>
            <Table<Skill>
              columns={[
                { key: "name", header: "Name", render: (row: Skill) => <strong>{row.name}</strong> },
                { key: "slug", header: "Slug", render: (row: Skill) => <code style={{ fontSize: "0.875rem" }}>{row.slug}</code> },
                { key: "description", header: "Description", render: (row: Skill) => (
                  <span style={{ maxWidth: "300px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.description}
                  </span>
                )},
                { key: "version", header: "Version" },
                { key: "created_at", header: "Created", render: (row: Skill) => new Date(row.created_at).toLocaleDateString() },
                { key: "actions", header: "Actions", render: (row: Skill) => (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
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
              emptyMessage="No skills"
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingSkill(null); resetForm(); }} title={editingSkill ? "Edit Skill" : "Create Skill"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, slug: e.target.value })}
            error={formErrors.slug}
            required
            helperText="Lowercase alphanumeric with hyphens"
            disabled={!!editingSkill}
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            error={formErrors.description}
            required
            rows={3}
          />
          <Textarea
            label="Schema (JSON)"
            value={formData.schema_json}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, schema_json: e.target.value })}
            rows={6}
            helperText="JSON schema for skill configuration"
          />
          <Input
            label="Version"
            value={formData.version}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, version: e.target.value })}
          />
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); setEditingSkill(null); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingSkill ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}