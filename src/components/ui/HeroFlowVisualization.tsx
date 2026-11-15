"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import aperture from "./hero-aperture.module.css";
import styles from "./hero-flow.module.css";

type NodeKey =
  | "manual"
  | "disconnected"
  | "messages"
  | "approvals"
  | "visibility"
  | "software"
  | "automation"
  | "integration"
  | "assistant"
  | "crm"
  | "custom"
  | "web";

type FlowNode = {
  id: NodeKey;
  label: string;
  description: string;
  icon: ReactNode;
};

const relationships: Partial<Record<NodeKey, NodeKey[]>> = {
  manual: ["automation", "integration"],
  disconnected: ["integration", "automation", "crm"],
  messages: ["assistant", "crm", "web"],
  approvals: ["automation", "custom"],
  visibility: ["crm", "integration", "custom"],
  software: ["custom", "web", "integration"],
};

const challenges: FlowNode[] = [
  {
    id: "manual",
    label: "Copying & pasting data",
    description:
      "Your team retypes the same order, invoice, or client details across email, spreadsheets, and internal apps. Workflow automation and connected systems pass that record across every tool the moment it arrives.",
    icon: (
      <>
        <rect
          x="4.5"
          y="4.5"
          width="10.5"
          height="12.5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9.5 7.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: "disconnected",
    label: "Apps that don’t talk",
    description:
      "Sales, operations, and billing each keep their own version of the truth because your software cannot share updates. System integrations sync records across your apps automatically so nobody has to export CSVs by hand.",
    icon: (
      <>
        <path
          d="M9.5 14.5 7.2 16.8a3.2 3.2 0 0 1-4.5-4.5l2.3-2.3M14.5 9.5l2.3-2.3a3.2 3.2 0 0 1 4.5 4.5l-2.3 2.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M9 9V6.5M6.5 9H9M15 15v2.5M17.5 15H15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: "messages",
    label: "Missed messages & leads",
    description:
      "Prospects ask questions after hours or during busy shifts and move on when nobody replies in time. An AI assistant answers common questions from your approved docs, qualifies the lead, and books the call on your calendar.",
    icon: (
      <>
        <path
          d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H9l-4.5 3.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 9.25h7M8.5 12.25h4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: "approvals",
    label: "Slow handoffs & approvals",
    description:
      "Requests sit buried in chat threads or email chains because nobody knows whose turn it is to sign off. Automated routing notifies the right reviewer right away, tracks status in one place, and keeps work moving.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 7.5V12l3.2 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "visibility",
    label: "Scattered client records",
    description:
      "Customer history lives scattered across inboxes, notebooks, and spreadsheets, so follow-ups slip through the cracks. A clean CRM pipeline linked to your forms and inbox gives the whole team one reliable timeline for every client.",
    icon: (
      <>
        <path
          d="M12 4.5 19.5 8.5 12 12.5 4.5 8.5 12 4.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m4.5 12.25 7.5 4 7.5-4M4.5 16l7.5 4 7.5-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "software",
    label: "Clunky software",
    description:
      "Off-the-shelf software forces your staff through awkward workarounds and extra clicks that slow down daily work. We build focused custom software and web portals shaped around how your team actually operates.",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 9h16M9 9v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
];

const solutions: FlowNode[] = [
  {
    id: "automation",
    label: "Workflow automation",
    description:
      "Move routine tasks between steps automatically, with clear rules and people involved where judgement matters. Your team spends its time on exceptions and customer care instead of repetitive admin.",
    icon: (
      <>
        <path
          d="M5.5 8.5h11a2.5 2.5 0 0 1 2.5 2.5v1M18.5 15.5h-11A2.5 2.5 0 0 1 5 13v-1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="m14 6 2.5 2.5L14 11M10 13l-2.5 2.5L10 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "integration",
    label: "System integrations",
    description:
      "Connect the apps you already rely on through dependable APIs and webhooks so updates flow in real time. Change a record once and every connected tool reflects it within seconds.",
    icon: (
      <>
        <circle cx="9.25" cy="12" r="4.75" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14.75" cy="12" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
  {
    id: "assistant",
    label: "AI assistants",
    description:
      "Give visitors and staff an assistant grounded in your approved knowledge that answers questions, qualifies enquiries, and books discovery calls. When a conversation needs a person, it hands over the full context cleanly.",
    icon: (
      <>
        <path
          d="M16.2 7.8a6 6 0 1 0 0 8.4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      </>
    ),
  },
  {
    id: "crm",
    label: "CRM & lead pipelines",
    description:
      "Organize every enquiry, client record, and follow-up task into a clear pipeline your team will actually use. Automated reminders and form syncs make sure every lead has an owner and a next step.",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.33 5v14M14.66 5v14" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
  {
    id: "custom",
    label: "Custom software",
    description:
      "Replace fragile spreadsheets and rigid subscription tools with an internal application built around your exact workflow. We design fast, straightforward interfaces that your staff can pick up on day one.",
    icon: (
      <>
        <path
          d="m8.5 9-3.5 3 3.5 3M15.5 9l3.5 3-3.5 3M13.25 7.5l-2.5 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: "web",
    label: "Websites & client portals",
    description:
      "Launch a fast website or client portal that explains your work clearly, captures structured project briefs, and books calls directly. Visitors get a clear path to work with you without back-and-forth emails.",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 9h16M10.5 15.5l4-4M11.5 11.5h3v3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

const allNodes: FlowNode[] = [...challenges, ...solutions];

function DiagramNode({
  node,
  side,
  active,
  related,
  selected,
  descriptionId,
  onPreview,
  onFocus,
  onSelect,
}: {
  node: FlowNode;
  side: "problem" | "solution";
  active: boolean;
  related: boolean;
  selected: boolean;
  descriptionId: string;
  onPreview: (id: NodeKey | null) => void;
  onFocus: (id: NodeKey | null) => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.node}
      data-side={side}
      data-active={active}
      data-related={related}
      aria-label={node.label}
      aria-pressed={selected}
      aria-describedby={descriptionId}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") onPreview(node.id);
      }}
      onPointerLeave={() => onPreview(null)}
      onFocus={() => onFocus(node.id)}
      onBlur={() => onFocus(null)}
      onClick={onSelect}
    >
      <div className={styles.iconWrapper}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          {node.icon}
        </svg>
      </div>
      <span className={styles.nodeLabel} aria-hidden="true">
        {node.label}
      </span>
    </button>
  );
}

export function HeroFlowVisualization() {
  const descriptionId = useId();
  const graphRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 510, height: 420 });
  const [hovered, setHovered] = useState<NodeKey | null>(null);
  const [focused, setFocused] = useState<NodeKey | null>(null);
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const activeNode = hovered ?? focused ?? selected;
  const activeMeta = allNodes.find((node) => node.id === activeNode);
  const related = activeNode
    ? (relationships[activeNode] ??
      challenges
        .filter((node) => relationships[node.id]?.includes(activeNode))
        .map((node) => node.id))
    : [];
  const relatedLabels = related
    .map((id) => allNodes.find((n) => n.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const routeTitle = activeMeta?.label;
  const isActiveProblem = Boolean(activeMeta && challenges.some((c) => c.id === activeMeta.id));

  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        setDimensions((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    const stage = graph?.closest<HTMLElement>("[data-hero-flow]");
    const svg = graph?.querySelector("svg");
    if (!graph || !stage || !svg) return;

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let inView = !("IntersectionObserver" in window);
    const update = () => {
      const playing = inView && !document.hidden && !motionQuery?.matches;
      stage.dataset.motionPlaying = String(playing);
      if (playing) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    };
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
          })
        : null;
    update();
    observer?.observe(stage);
    document.addEventListener("visibilitychange", update);
    motionQuery?.addEventListener("change", update);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      motionQuery?.removeEventListener("change", update);
    };
  }, []);

  const getReticleRotation = () => {
    const index = allNodes.findIndex((node) => node.id === activeNode);
    const angles = [
      "-55deg",
      "-33deg",
      "-11deg",
      "11deg",
      "33deg",
      "55deg",
      "55deg",
      "33deg",
      "11deg",
      "-11deg",
      "-33deg",
      "-55deg",
    ];
    return index < 0 ? "0deg" : (angles[index] ?? "0deg");
  };

  const isSmall = dimensions.height <= 390 || dimensions.width <= 640;
  const nodeRadius = isSmall ? 24 : 28;
  const startX = nodeRadius;
  const endX = dimensions.width - nodeRadius;
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const count = challenges.length;
  const usableSpan = Math.max(1, dimensions.height - nodeRadius * 2);
  const yOffsets = Array.from({ length: count }, (_, idx) =>
    Math.round(nodeRadius + (usableSpan * idx) / (count - 1)),
  );

  const renderNodes = (nodes: FlowNode[], side: "problem" | "solution") =>
    nodes.map((node) => (
      <DiagramNode
        key={node.id}
        node={node}
        side={side}
        active={activeNode === node.id}
        related={related.includes(node.id)}
        selected={selected === node.id}
        descriptionId={descriptionId}
        onPreview={setHovered}
        onFocus={setFocused}
        onSelect={() => {
          setSelected(selected === node.id ? null : node.id);
          setHovered(null);
          setFocused(null);
        }}
      />
    ));

  return (
    <div
      className={styles.stage}
      data-hero-flow=""
      data-motion-playing="false"
      aria-label="Interactive flow: Business challenges through Clarteon to technology solutions"
      role="region"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSelected(null);
          setHovered(null);
          setFocused(null);
        }
      }}
    >
      <div className={styles.categories} aria-hidden="true">
        <span className={styles.categoryLabel}>Business challenges</span>
        <span className={styles.categoryLabel}>Technology solutions</span>
      </div>

      <div ref={graphRef} className={styles.graphArea}>
        <svg
          className={styles.svgNetwork}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="flowProblemToCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#5c5c58" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c6f432" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="flowCoreToSolution" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c6f432" stopOpacity="1" />
              <stop offset="55%" stopColor="#9fcc10" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {[challenges, solutions].flatMap((nodes, side) =>
            nodes.map((node, index) => {
              const y = yOffsets[index];
              const path =
                side === 0
                  ? `M ${startX} ${y} C ${startX + (centerX - startX) * 0.48} ${y}, ${
                      centerX - (centerX - startX) * 0.48
                    } ${centerY}, ${centerX} ${centerY}`
                  : `M ${centerX} ${centerY} C ${centerX + (endX - centerX) * 0.48} ${centerY}, ${
                      endX - (endX - centerX) * 0.48
                    } ${y}, ${endX} ${y}`;
              const emphasis =
                activeNode === node.id || related.includes(node.id)
                  ? "active"
                  : activeNode
                    ? "muted"
                    : "idle";
              const strokeGradient =
                emphasis === "active"
                  ? side === 0
                    ? "url(#flowProblemToCore)"
                    : "url(#flowCoreToSolution)"
                  : undefined;

              return (
                <g key={node.id}>
                  <path className={styles.railTrack} d={path} vectorEffect="non-scaling-stroke" />

                  <path
                    className={styles.glowCorridor}
                    d={path}
                    stroke={strokeGradient ?? (side === 0 ? "var(--ink)" : "var(--lime)")}
                    data-emphasis={emphasis}
                    data-side={side === 0 ? "problem" : "solution"}
                    vectorEffect="non-scaling-stroke"
                  />

                  <path
                    data-node={node.id}
                    data-side={side === 0 ? "problem" : "solution"}
                    data-emphasis={emphasis}
                    className={styles.connector}
                    d={path}
                    stroke={strokeGradient}
                    vectorEffect="non-scaling-stroke"
                  />

                  <circle
                    className={styles.particle}
                    data-side={side === 0 ? "problem" : "solution"}
                    data-emphasis={emphasis}
                    r={emphasis === "active" ? 4.5 : 3}
                  >
                    <animateMotion
                      path={path}
                      dur={(side === 0 ? 2.6 : 1.6) + index * 0.14 + "s"}
                      begin={index * -0.42 + "s"}
                      calcMode="linear"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            }),
          )}
        </svg>

        <div className={styles.gridColumns}>
          <div className={styles.columnProblems} role="group" aria-label="Business challenges">
            {renderNodes(challenges, "problem")}
          </div>

          <div className={aperture.center}>
            <div
              className={aperture.housing}
              data-active={activeNode ? "true" : "false"}
              aria-hidden="true"
            >
              <div className={aperture.ambientGlow} />
              <div className={aperture.pulseWave} />

              <svg className={aperture.outerDial} viewBox="0 0 200 200" fill="none">
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  stroke="var(--ink)"
                  strokeOpacity="0.12"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="84"
                  stroke="var(--ink)"
                  strokeOpacity="0.08"
                  strokeWidth="0.75"
                />
                <line
                  x1="100"
                  y1="4"
                  x2="100"
                  y2="12"
                  stroke="var(--ink)"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
                <line
                  x1="100"
                  y1="188"
                  x2="100"
                  y2="196"
                  stroke="var(--ink)"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
                <line
                  x1="4"
                  y1="100"
                  x2="12"
                  y2="100"
                  stroke="var(--ink)"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
                <line
                  x1="188"
                  y1="100"
                  x2="196"
                  y2="100"
                  stroke="var(--ink)"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
              </svg>

              <svg
                className={aperture.ring}
                style={{ transform: `rotate(${getReticleRotation()})` }}
                viewBox="0 0 174 174"
                fill="none"
              >
                <circle cx="87" cy="87" r="75" stroke="var(--paper)" strokeOpacity="0.18" />
                <circle
                  cx="87"
                  cy="87"
                  r="75"
                  stroke="var(--lime)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="36 436"
                  transform="rotate(-90 87 87)"
                />
                <circle
                  cx="87"
                  cy="87"
                  r="75"
                  stroke="var(--lime)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="16 456"
                  strokeOpacity="0.6"
                  transform="rotate(90 87 87)"
                />
              </svg>

              <div className={aperture.tile}>
                <div className={aperture.tileSheen} />
                <svg className={aperture.symbol} viewBox="0 0 32 32" focusable="false">
                  <rect width="32" height="32" rx="8" fill="var(--lime)" />
                  <path
                    d="M21.3 10a8 8 0 1 0 0 12"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <circle
                    key={activeNode ?? "idle"}
                    className={activeNode ? aperture.focus : undefined}
                    cx="16"
                    cy="16"
                    r="2.6"
                    fill="var(--ink)"
                  />
                </svg>
              </div>
            </div>

            <div className={aperture.wordmark}>Clarteon</div>
          </div>

          <div className={styles.columnSolutions} role="group" aria-label="Technology solutions">
            {renderNodes(solutions, "solution")}
          </div>
        </div>
      </div>

      <div
        className={styles.inspectionBar}
        data-flow-explanation=""
        data-side={activeMeta ? (isActiveProblem ? "problem" : "solution") : "idle"}
      >
        <div className={styles.description}>
          <div className={styles.sizingCopy} aria-hidden="true">
            <p className={styles.message}>
              <span className={styles.messageMeta}>
                <strong className={styles.messageTitle}>How challenges connect to solutions</strong>
                <span className={styles.connectedList}>
                  <span className={styles.connectedTag}>6 business challenges</span>
                  <span className={styles.connectedTag}>6 technology solutions</span>
                </span>
              </span>
              <span className={styles.messageBody}>
                Every business challenge on the left maps to one or more technology solutions on the
                right. Select an icon to learn more.
              </span>
            </p>
            {allNodes.map((node) => {
              const nodeRelated = (
                relationships[node.id] ??
                challenges.filter((c) => relationships[c.id]?.includes(node.id)).map((c) => c.id)
              )
                .map((id) => allNodes.find((n) => n.id === id)?.label)
                .filter((label): label is string => Boolean(label));
              return (
                <p key={node.id} className={styles.message}>
                  <span className={styles.messageMeta}>
                    <strong className={styles.messageTitle}>{node.label}</strong>
                    <span className={styles.connectedList}>
                      {nodeRelated.map((label) => (
                        <span key={label} className={styles.connectedTag}>
                          {label}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className={styles.messageBody}>{node.description}</span>
                </p>
              );
            })}
          </div>
          <div id={descriptionId} role="status" aria-live="polite" aria-atomic="true">
            {activeMeta ? (
              <p key={activeMeta.id} className={styles.message}>
                <span className={styles.messageMeta}>
                  <strong className={styles.messageTitle}>{routeTitle}</strong>
                  {relatedLabels.length > 0 ? (
                    <span className={styles.connectedList}>
                      {relatedLabels.map((label) => (
                        <span key={label} className={styles.connectedTag}>
                          {label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className={styles.messageBody}>{activeMeta.description}</span>
              </p>
            ) : (
              <p className={styles.message}>
                <span className={styles.messageMeta}>
                  <strong className={styles.messageTitle}>
                    How challenges connect to solutions
                  </strong>
                  <span className={styles.connectedList}>
                    <span className={styles.connectedTag}>6 business challenges</span>
                    <span className={styles.connectedTag}>6 technology solutions</span>
                  </span>
                </span>
                <span className={styles.messageBody}>
                  Every business challenge on the left maps to one or more technology solutions on
                  the right. Select an icon to learn more.
                </span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.reset}
          disabled={!selected}
          onClick={() => {
            setSelected(null);
            setHovered(null);
            setFocused(null);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
