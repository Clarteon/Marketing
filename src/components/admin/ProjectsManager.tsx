"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_CATEGORIES, type AdminProjectRecord } from "@/lib/admin/site-config-defaults";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

interface ProjectsManagerProps {
  initialProjects: AdminProjectRecord[];
  configured: boolean;
  schemaMissing?: boolean;
}

function emptyProject(order: number): AdminProjectRecord {
  return {
    slug: "",
    title: "",
    summary: "",
    client: null,
    category: "operations",
    categoryLabel: null,
    solution_type: null,
    image: null,
    imageAlt: null,
    secondaryImage: null,
    secondaryImageAlt: null,
    liveUrl: null,
    problemBrief: null,
    approachBrief: null,
    outcomeBrief: null,
    highlights: [""],
    tags: [],
    body: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    order,
    featuredOnHome: false,
    status: "published",
  };
}

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ProjectsManager({
  initialProjects,
  configured,
  schemaMissing = false,
}: ProjectsManagerProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<AdminProjectRecord[]>(initialProjects);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialProjects[0]?.slug ?? "__new__");
  const [isNew, setIsNew] = useState<boolean>(initialProjects.length === 0);
  const [draft, setDraft] = useState<AdminProjectRecord>(
    initialProjects[0] ?? emptyProject(initialProjects.length + 1),
  );
  const [tagsText, setTagsText] = useState<string>((initialProjects[0]?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const canWrite = configured && !schemaMissing;

  function selectProject(project: AdminProjectRecord) {
    setSelectedSlug(project.slug);
    setIsNew(false);
    setDraft({
      ...project,
      highlights: project.highlights.length > 0 ? [...project.highlights] : [""],
    });
    setTagsText(project.tags.join(", "));
    setConfirmDelete(false);
    setStatusMessage(null);
  }

  function startNewProject() {
    const nextOrder = projects.reduce((max, item) => Math.max(max, item.order), 0) + 1;
    const blank = emptyProject(nextOrder);
    setSelectedSlug("__new__");
    setIsNew(true);
    setDraft(blank);
    setTagsText("");
    setConfirmDelete(false);
    setStatusMessage(null);
  }

  function updateField<Field extends keyof AdminProjectRecord>(
    key: Field,
    value: AdminProjectRecord[Field],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateHighlight(index: number, value: string) {
    setDraft((prev) => {
      const next = [...prev.highlights];
      next[index] = value;
      return { ...prev, highlights: next };
    });
  }

  function addHighlightRow() {
    if (draft.highlights.length >= 12) return;
    setDraft((prev) => ({ ...prev, highlights: [...prev.highlights, ""] }));
  }

  function removeHighlightRow(index: number) {
    setDraft((prev) => {
      const next = prev.highlights.filter((_, idx) => idx !== index);
      return { ...prev, highlights: next.length > 0 ? next : [""] };
    });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || saving) return;

    setSaving(true);
    setStatusMessage(null);

    const payload = {
      ...draft,
      slug: isNew ? draft.slug.trim() || slugifyTitle(draft.title) : draft.slug,
      highlights: draft.highlights.map((item) => item.trim()).filter(Boolean),
      tags: tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    };

    try {
      const endpoint = isNew
        ? "/api/admin/projects"
        : `/api/admin/projects/${encodeURIComponent(selectedSlug)}`;
      const method = isNew ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        project?: AdminProjectRecord;
      };

      if (!response.ok || !body.ok || !body.project) {
        setStatusMessage({
          kind: "error",
          text:
            body.error === "project_slug_conflict"
              ? "A project with that URL slug already exists. Pick a unique slug."
              : "Could not save project. Check that title, slug, summary, and image paths are valid.",
        });
        return;
      }

      const saved = body.project;
      const nextList = isNew
        ? [...projects, saved]
        : projects.map((item) => (item.slug === saved.slug ? saved : item));

      nextList.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
      setProjects(nextList);
      selectProject(saved);
      setStatusMessage({
        kind: "success",
        text: isNew
          ? `Added project "${saved.title}" and synced live showcase routes.`
          : `Saved changes to "${saved.title}".`,
      });
      router.refresh();
    } catch {
      setStatusMessage({
        kind: "error",
        text: "Network error while saving project.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canWrite || isNew || saving) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/admin/projects/${encodeURIComponent(selectedSlug)}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean };
      if (!response.ok || !body.ok) {
        setStatusMessage({
          kind: "error",
          text: "Could not delete project.",
        });
        return;
      }

      const remaining = projects.filter((item) => item.slug !== selectedSlug);
      setProjects(remaining);
      if (remaining[0]) {
        selectProject(remaining[0]);
      } else {
        startNewProject();
      }
      setStatusMessage({
        kind: "success",
        text: "Project deleted from database.",
      });
      router.refresh();
    } catch {
      setStatusMessage({
        kind: "error",
        text: "Network error while deleting project.",
      });
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className={styles.cmsWorkspace}>
      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Project database storage is not configured. Showing existing case studies from
            checked-in Markdown files in read-only mode. Add <code>DATABASE_URL</code> and run{" "}
            <code>npm run db:init</code> to store, add, and edit projects directly from the
            dashboard.
          </p>
        </div>
      ) : null}

      {schemaMissing ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            The <code>site_projects</code> table has not been applied yet. Showing checked-in case
            studies in read-only mode until you run <code>npm run db:init</code>.
          </p>
        </div>
      ) : null}

      <div className={styles.cmsGrid}>
        <aside className={styles.cmsSidebar} aria-label="Stored projects">
          <div className={styles.cmsSidebarHeader}>
            <h2 className={styles.sectionTitle}>Projects ({projects.length})</h2>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={startNewProject}
              disabled={!canWrite}
            >
              + New project
            </button>
          </div>

          <ul className={styles.cmsProjectList}>
            {projects.map((project) => {
              const selected = !isNew && selectedSlug === project.slug;
              return (
                <li key={project.slug}>
                  <button
                    type="button"
                    className={cx(styles.cmsProjectItem, selected && styles.cmsProjectItemActive)}
                    onClick={() => selectProject(project)}
                  >
                    <div className={styles.cmsProjectItemTop}>
                      <span className={styles.cmsOrderBadge}>#{project.order}</span>
                      <span
                        className={cx(
                          styles.badge,
                          project.status === "published"
                            ? styles.badgeConfirmed
                            : styles.badgePending,
                        )}
                      >
                        {project.status}
                      </span>
                      {project.featuredOnHome ? (
                        <span className={styles.cmsHomeTag}>Home</span>
                      ) : null}
                    </div>
                    <strong className={styles.cmsProjectItemTitle}>{project.title}</strong>
                    <span className={styles.cmsProjectItemMeta}>
                      {project.client ?? project.category} · /our-work/{project.slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={styles.panel} aria-labelledby="project-editor-heading">
          <div className={styles.cmsEditorHead}>
            <div>
              <h2 id="project-editor-heading" className={styles.sectionTitle}>
                {isNew ? "Add new project" : `Edit: ${draft.title || selectedSlug}`}
              </h2>
              <p className={styles.cmsEditorHint}>
                Manage deliverables, features, and showcase metadata shown on Home and Our work.
              </p>
            </div>
            {!isNew && draft.status === "published" ? (
              <a
                href={`/our-work/${draft.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sectionLink}
              >
                Open public page
              </a>
            ) : null}
          </div>

          {statusMessage ? (
            <p
              className={statusMessage.kind === "success" ? styles.success : styles.error}
              role="status"
            >
              {statusMessage.text}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-title">
                  Project title
                </label>
                <input
                  id="project-title"
                  className={styles.input}
                  type="text"
                  required
                  maxLength={180}
                  value={draft.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-slug">
                  URL slug
                </label>
                <input
                  id="project-slug"
                  className={styles.input}
                  type="text"
                  required
                  maxLength={100}
                  value={draft.slug}
                  placeholder="custom-portal-build"
                  onChange={(event) => updateField("slug", event.target.value)}
                  readOnly={!canWrite || !isNew}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="project-summary">
                Summary
              </label>
              <textarea
                id="project-summary"
                className={cx(styles.textarea, styles.cmsShortArea)}
                required
                maxLength={500}
                value={draft.summary}
                onChange={(event) => updateField("summary", event.target.value)}
                readOnly={!canWrite}
              />
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-client">
                  Client / sample label
                </label>
                <input
                  id="project-client"
                  className={styles.input}
                  type="text"
                  maxLength={120}
                  value={draft.client ?? ""}
                  onChange={(event) => updateField("client", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-solution-type">
                  Solution type badge
                </label>
                <input
                  id="project-solution-type"
                  className={styles.input}
                  type="text"
                  maxLength={120}
                  placeholder="Automated workflow + dashboard"
                  value={draft.solution_type ?? ""}
                  onChange={(event) => updateField("solution_type", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>
            </div>

            <div className={styles.cmsTripleRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-category">
                  Category
                </label>
                <select
                  id="project-category"
                  className={styles.input}
                  value={draft.category}
                  onChange={(event) =>
                    updateField("category", event.target.value as AdminProjectRecord["category"])
                  }
                  disabled={!canWrite}
                >
                  {PROJECT_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-status">
                  Publish status
                </label>
                <select
                  id="project-status"
                  className={styles.input}
                  value={draft.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as "draft" | "published")
                  }
                  disabled={!canWrite}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-order">
                  Display order
                </label>
                <input
                  id="project-order"
                  className={styles.input}
                  type="number"
                  min={1}
                  max={999}
                  value={draft.order}
                  onChange={(event) => updateField("order", Number(event.target.value) || 99)}
                  readOnly={!canWrite}
                />
              </div>
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-category-label">
                  Custom category pill text
                </label>
                <input
                  id="project-category-label"
                  className={styles.input}
                  type="text"
                  maxLength={120}
                  value={draft.categoryLabel ?? ""}
                  onChange={(event) => updateField("categoryLabel", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-published-at">
                  Published date (YYYY-MM-DD)
                </label>
                <input
                  id="project-published-at"
                  className={styles.input}
                  type="text"
                  maxLength={10}
                  value={draft.publishedAt ?? ""}
                  placeholder="2026-11-15"
                  onChange={(event) => updateField("publishedAt", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>
            </div>

            <label className={styles.cmsCheckboxRow} htmlFor="project-featured-home">
              <input
                id="project-featured-home"
                type="checkbox"
                checked={draft.featuredOnHome}
                onChange={(event) => updateField("featuredOnHome", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Feature this project in the homepage Built around real bottlenecks ledger</span>
            </label>

            <div className={styles.field}>
              <div className={styles.cmsHighlightsHeader}>
                <span className={styles.label}>Project features &amp; outcomes</span>
                <button
                  type="button"
                  className={styles.cmsSmallButton}
                  onClick={addHighlightRow}
                  disabled={!canWrite || draft.highlights.length >= 12}
                >
                  + Add feature
                </button>
              </div>
              <div className={styles.cmsHighlightsList}>
                {draft.highlights.map((item, index) => (
                  <div key={index} className={styles.cmsHighlightRow}>
                    <label className={styles.srOnly} htmlFor={`project-highlight-${index}`}>
                      Feature or outcome {index + 1}
                    </label>
                    <input
                      id={`project-highlight-${index}`}
                      className={styles.input}
                      type="text"
                      maxLength={200}
                      placeholder="Automated lead or order handoff feature..."
                      value={item}
                      onChange={(event) => updateHighlight(index, event.target.value)}
                      readOnly={!canWrite}
                    />
                    <button
                      type="button"
                      className={styles.cmsRemoveButton}
                      onClick={() => removeHighlightRow(index)}
                      disabled={!canWrite}
                      aria-label={`Remove feature ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.cmsSectionDivider}>
              <h3 className={styles.cmsSubheading}>Problem, solution &amp; result breakdown</h3>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-problem-brief">
                  The problem
                </label>
                <textarea
                  id="project-problem-brief"
                  className={cx(styles.textarea, styles.cmsShortArea)}
                  maxLength={600}
                  value={draft.problemBrief ?? ""}
                  onChange={(event) => updateField("problemBrief", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-approach-brief">
                  What we built
                </label>
                <textarea
                  id="project-approach-brief"
                  className={cx(styles.textarea, styles.cmsShortArea)}
                  maxLength={600}
                  value={draft.approachBrief ?? ""}
                  onChange={(event) => updateField("approachBrief", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-outcome-brief">
                  What changed
                </label>
                <textarea
                  id="project-outcome-brief"
                  className={cx(styles.textarea, styles.cmsShortArea)}
                  maxLength={600}
                  value={draft.outcomeBrief ?? ""}
                  onChange={(event) => updateField("outcomeBrief", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>
            </div>

            <div className={styles.cmsSectionDivider}>
              <h3 className={styles.cmsSubheading}>Media &amp; links</h3>
              <div className={styles.twoColumns}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project-image">
                    Primary image path or https:// URL
                  </label>
                  <input
                    id="project-image"
                    className={styles.input}
                    type="text"
                    maxLength={500}
                    placeholder="/images/work/example.webp"
                    value={draft.image ?? ""}
                    onChange={(event) => updateField("image", event.target.value || null)}
                    readOnly={!canWrite}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project-image-alt">
                    Primary image alt text
                  </label>
                  <input
                    id="project-image-alt"
                    className={styles.input}
                    type="text"
                    maxLength={240}
                    value={draft.imageAlt ?? ""}
                    onChange={(event) => updateField("imageAlt", event.target.value || null)}
                    readOnly={!canWrite}
                  />
                </div>
              </div>

              <div className={styles.twoColumns}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project-live-url">
                    Live demo URL (optional)
                  </label>
                  <input
                    id="project-live-url"
                    className={styles.input}
                    type="url"
                    maxLength={500}
                    placeholder="https://example.com"
                    value={draft.liveUrl ?? ""}
                    onChange={(event) => updateField("liveUrl", event.target.value || null)}
                    readOnly={!canWrite}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project-tags">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="project-tags"
                    className={styles.input}
                    type="text"
                    maxLength={400}
                    value={tagsText}
                    onChange={(event) => setTagsText(event.target.value)}
                    readOnly={!canWrite}
                  />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="project-body">
                Full case study narrative (Markdown)
              </label>
              <textarea
                id="project-body"
                className={styles.textarea}
                maxLength={16000}
                value={draft.body}
                onChange={(event) => updateField("body", event.target.value)}
                readOnly={!canWrite}
              />
            </div>

            <div className={styles.cmsActionRow}>
              <button type="submit" className={styles.primaryButton} disabled={!canWrite || saving}>
                {saving ? "Saving..." : isNew ? "Create project" : "Save project"}
              </button>

              {!isNew && canWrite ? (
                confirmDelete ? (
                  <div className={styles.cmsDeleteConfirm}>
                    <span>Delete this project?</span>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      className={styles.cmsSmallButton}
                      onClick={() => setConfirmDelete(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.cmsRemoveButton}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete project
                  </button>
                )
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
