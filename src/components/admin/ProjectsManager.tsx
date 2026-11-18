"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_CATEGORIES, type AdminProjectRecord } from "@/lib/admin/site-config-defaults";
import { AnimatedCheckbox } from "@/components/ui/AnimatedCheckbox";
import { SelectField } from "@/components/ui/SelectField";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

interface ProjectsManagerProps {
  initialProjects: AdminProjectRecord[];
  configured: boolean;
  schemaMissing?: boolean;
}

const CATEGORY_OPTIONS = PROJECT_CATEGORIES.map((option) => ({
  value: option.value,
  label: option.label,
}));

const STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const CATEGORY_LABELS = new Map<string, string>(
  PROJECT_CATEGORIES.map((option) => [option.value, option.label]),
);

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
  const savedProject = isNew ? null : (projects.find((item) => item.slug === selectedSlug) ?? null);

  const isDirty = savedProject
    ? JSON.stringify({ ...draft, tagsText }) !==
      JSON.stringify({
        ...savedProject,
        highlights: savedProject.highlights.length > 0 ? savedProject.highlights : [""],
        tagsText: savedProject.tags.join(", "),
      })
    : true;

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

      <section className={cx(styles.panel, styles.detailPanel)} aria-label="Stored projects">
        <div className={styles.cmsPanelHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Projects ({projects.length})</h2>
            <p className={styles.sectionIntro}>
              Select a case study to edit below, or start a new entry.
            </p>
          </div>
          <button
            type="button"
            className={cx(styles.secondaryButton, styles.cmsHeaderButton)}
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
                    {project.client ?? CATEGORY_LABELS.get(project.category) ?? project.category} ·
                    /our-work/{project.slug}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={styles.cmsStatusRow}>
        <div className={styles.cmsStatusMeta}>
          <span
            className={cx(
              styles.badge,
              isNew
                ? styles.badgeNew
                : draft.status === "published"
                  ? styles.badgeConfirmed
                  : styles.badgePending,
            )}
          >
            {isNew ? "New draft" : draft.status}
          </span>
          <span>
            {draft.categoryLabel || CATEGORY_LABELS.get(draft.category) || draft.category}
          </span>
          <span>Order #{draft.order}</span>
          <span>{draft.featuredOnHome ? "Featured on Home" : "Our work only"}</span>
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

      <form className={styles.detailStack} onSubmit={handleSave}>
        <section
          className={cx(styles.panel, styles.detailPanel)}
          aria-labelledby="project-details-heading"
        >
          <div>
            <h2 id="project-details-heading" className={styles.sectionTitle}>
              {isNew ? "New project details" : `Editing: ${draft.title || selectedSlug}`}
            </h2>
            <p className={styles.sectionIntro}>
              Core title, URL slug, client label, category, and publishing controls shown on Home
              and Our work.
            </p>
          </div>

          <div className={styles.cmsFieldsGrid}>
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
                  required={!isNew}
                  maxLength={100}
                  value={draft.slug}
                  placeholder="custom-portal-build"
                  onChange={(event) => updateField("slug", event.target.value)}
                  readOnly={!canWrite || !isNew}
                />
                {isNew ? (
                  <p className={styles.hint}>
                    Lowercase letters, numbers, and hyphens only. Leave blank to derive from title.
                  </p>
                ) : null}
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
                rows={3}
                value={draft.summary}
                onChange={(event) => updateField("summary", event.target.value)}
                readOnly={!canWrite}
              />
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-client">
                  Client or sample label
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

            <div className={styles.twoColumns}>
              <SelectField
                id="project-category"
                label="Category"
                options={CATEGORY_OPTIONS}
                value={draft.category}
                disabled={!canWrite}
                onValueChange={(value) => {
                  if (value) {
                    updateField("category", value as AdminProjectRecord["category"]);
                  }
                }}
              />

              <SelectField
                id="project-status"
                label="Publish status"
                options={STATUS_OPTIONS}
                value={draft.status}
                disabled={!canWrite}
                onValueChange={(value) => {
                  if (value === "published" || value === "draft") {
                    updateField("status", value);
                  }
                }}
              />
            </div>

            <div className={styles.twoColumns}>
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
                <p className={styles.hint}>Lower numbers appear first in Our work.</p>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-published-at">
                  Published date
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
                <p className={styles.hint}>Use YYYY-MM-DD format.</p>
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

            <AnimatedCheckbox
              id="project-featured-home"
              compact
              className={styles.cmsCheckboxRow}
              checked={draft.featuredOnHome}
              onChange={(event) => updateField("featuredOnHome", event.target.checked)}
              disabled={!canWrite}
            >
              Feature this project on the Home showcase
            </AnimatedCheckbox>
          </div>
        </section>

        <section
          className={cx(styles.panel, styles.detailPanel)}
          aria-labelledby="project-breakdown-heading"
        >
          <div>
            <h2 id="project-breakdown-heading" className={styles.sectionTitle}>
              Features &amp; breakdown
            </h2>
            <p className={styles.sectionIntro}>
              Deliverable highlights and the problem, solution, and result summary shown on case
              study cards and modals.
            </p>
          </div>

          <div className={styles.cmsFieldsGrid}>
            <div className={styles.field}>
              <div className={styles.cmsHighlightsHeader}>
                <span className={styles.label}>Project features &amp; outcomes</span>
                <button
                  type="button"
                  className={styles.secondaryButton}
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
                      placeholder="Automated lead or order handoff feature"
                      value={item}
                      onChange={(event) => updateHighlight(index, event.target.value)}
                      readOnly={!canWrite}
                    />
                    <button
                      type="button"
                      className={styles.cmsRemovePill}
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
              <h3 className={styles.cmsSubheading}>Problem, solution &amp; result</h3>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-problem-brief">
                  The problem
                </label>
                <textarea
                  id="project-problem-brief"
                  className={cx(styles.textarea, styles.cmsShortArea)}
                  maxLength={600}
                  rows={3}
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
                  rows={3}
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
                  rows={3}
                  value={draft.outcomeBrief ?? ""}
                  onChange={(event) => updateField("outcomeBrief", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className={cx(styles.panel, styles.detailPanel)}
          aria-labelledby="project-media-heading"
        >
          <div>
            <h2 id="project-media-heading" className={styles.sectionTitle}>
              Media, links &amp; narrative
            </h2>
            <p className={styles.sectionIntro}>
              Primary showcase photography, optional workflow graphic, live demo link, and the
              Markdown case study article.
            </p>
          </div>

          <div className={styles.cmsFieldsGrid}>
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-image">
                  Primary image path or URL
                </label>
                <input
                  id="project-image"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  placeholder="/images/work/custom-portal.webp"
                  value={draft.image ?? ""}
                  onChange={(event) => updateField("image", event.target.value || null)}
                  readOnly={!canWrite}
                />
                <p className={styles.hint}>Use a /images/... path or an https:// URL.</p>
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
                <label className={styles.label} htmlFor="project-secondary-image">
                  Secondary image path or URL
                </label>
                <input
                  id="project-secondary-image"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  placeholder="/images/work/custom-portal-workflow.webp"
                  value={draft.secondaryImage ?? ""}
                  onChange={(event) => updateField("secondaryImage", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="project-secondary-image-alt">
                  Secondary image alt text
                </label>
                <input
                  id="project-secondary-image-alt"
                  className={styles.input}
                  type="text"
                  maxLength={240}
                  value={draft.secondaryImageAlt ?? ""}
                  onChange={(event) => updateField("secondaryImageAlt", event.target.value || null)}
                  readOnly={!canWrite}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="project-live-url">
                Live demo URL (optional)
              </label>
              <input
                id="project-live-url"
                className={styles.input}
                type="url"
                maxLength={500}
                placeholder="https://portal.clarteon.tech"
                value={draft.liveUrl ?? ""}
                onChange={(event) => updateField("liveUrl", event.target.value || null)}
                readOnly={!canWrite}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="project-body">
                Full case study narrative (Markdown)
              </label>
              <textarea
                id="project-body"
                className={cx(styles.textarea, styles.cmsNarrativeArea)}
                maxLength={16000}
                rows={10}
                value={draft.body}
                onChange={(event) => updateField("body", event.target.value)}
                readOnly={!canWrite}
              />
            </div>
          </div>
        </section>

        <div className={styles.cmsWorkspace}>
          {statusMessage ? (
            <p
              className={statusMessage.kind === "success" ? styles.success : styles.error}
              role={statusMessage.kind === "error" ? "alert" : "status"}
            >
              {statusMessage.text}
            </p>
          ) : null}

          <div className={styles.cmsActionRow}>
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={!canWrite || saving}>
                {saving ? "Saving..." : isNew ? "Create project" : "Save project"}
              </button>
              {isNew && projects[0] ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => selectProject(projects[0])}
                  disabled={saving}
                >
                  Cancel
                </button>
              ) : null}
              {!isNew && savedProject ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => selectProject(savedProject)}
                  disabled={!canWrite || saving || !isDirty}
                >
                  Reset changes
                </button>
              ) : null}
            </div>

            {!isNew && canWrite && !confirmDelete ? (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                Delete project
              </button>
            ) : null}
          </div>

          {!isNew && canWrite && confirmDelete ? (
            <div className={cx(styles.panel, styles.detailPanel)}>
              <p className={styles.cancelWarning}>
                Delete &ldquo;{draft.title || selectedSlug}&rdquo;? It will be removed from the
                database and live showcase routes.
              </p>
              <div className={styles.cancelActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Keep project
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? "Deleting..." : "Yes, delete project"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
