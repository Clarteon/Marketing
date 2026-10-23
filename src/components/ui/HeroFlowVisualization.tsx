"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import aperture from "./hero-aperture.module.css";
import styles from "./hero-flow.module.css";

type NodeKey =
  | "manual"
  | "disconnected"
  | "messages"
  | "software"
  | "automation"
  | "integration"
  | "assistant"
  | "custom";

type FlowNode = {
  id: NodeKey;
  label: string;
  description: string;
  icon: ReactNode;
};

// Possible directions to explore, rather than promises of a fixed solution.
const relationships: Partial<Record<NodeKey, NodeKey[]>> = {
  manual: ["automation", "integration"],
  disconnected: ["integration", "automation"],
  messages: ["assistant", "integration"],
  software: ["custom", "integration"],
};

const challenges: FlowNode[] = [
  {
    id: "manual",
    label: "Copying & pasting data",
    description:
      "Workflow automation and connected systems can reduce repeated data entry, giving your team more time for meaningful work.",
    icon: (
      <path
        fillRule="evenodd"
        d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.8V8h4.2L14 3.8ZM8 11a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2H8Zm0 4a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2H8Zm0 4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H8Z"
      />
    ),
  },
  {
    id: "disconnected",
    label: "Apps that don’t talk",
    description:
      "System integrations can keep information in sync. Workflow automation can then move work between your tools.",
    icon: (
      <>
        <path
          fillRule="evenodd"
          d="M4 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 3v4h4V6H5Zm9 5h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm1 3v4h4v-4h-4Z"
        />
        <rect x="16" y="4" width="5" height="2" rx="1" />
        <rect x="3" y="18" width="5" height="2" rx="1" />
      </>
    ),
  },
  {
    id: "messages",
    label: "Missed messages & leads",
    description:
      "An AI assistant can answer common questions. Connected systems can help route enquiries to the right person.",
    icon: (
      <path
        fillRule="evenodd"
        d="M5 3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9l-5 3v-3.2A3 3 0 0 1 2 16V6a3 3 0 0 1 3-3Zm2 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      />
    ),
  },
  {
    id: "software",
    label: "Clunky software",
    description:
      "Custom software can fit the way your team works, with integrations to keep useful existing tools connected.",
    icon: (
      <path
        fillRule="evenodd"
        d="M5 3h14a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 3v2h14V6H5Zm4 5a1 1 0 0 0-1 1H6v2h2a1 1 0 0 0 2 0h8v-2h-8a1 1 0 0 0-1-1Zm6 5a1 1 0 0 0-1 1H6v2h8a1 1 0 0 0 2 0h2v-2h-2a1 1 0 0 0-1-1Z"
      />
    ),
  },
];

const solutions: FlowNode[] = [
  {
    id: "automation",
    label: "Workflow automation",
    description:
      "Move routine tasks between steps automatically, with clear rules and people involved where judgement matters.",
    icon: (
      <path
        fillRule="evenodd"
        d="m10 2-.5 3-1.8.8-2.5-1.7-2.1 3.6 2.5 1.8-.2 2 .2 2-2.5 1.8 2.1 3.6 2.5-1.7 1.8.8.5 3h4l.5-3 1.8-.8 2.5 1.7 2.1-3.6-2.5-1.8.2-2-.2-2 2.5-1.8-2.1-3.6-2.5 1.7-1.8-.8-.5-3h-4Zm2 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
      />
    ),
  },
  {
    id: "integration",
    label: "System integrations",
    description:
      "Connect the tools you already use so information can move between them without repeated copying and pasting.",
    icon: (
      <>
        <rect x="10.5" y="4" width="3" height="4" rx="1.5" />
        <rect x="10.5" y="16" width="3" height="4" rx="1.5" />
        <rect x="4" y="10.5" width="4" height="3" rx="1.5" />
        <rect x="16" y="10.5" width="4" height="3" rx="1.5" />
        <circle cx="12" cy="4" r="3" />
        <circle cx="4" cy="12" r="3" />
        <circle cx="20" cy="12" r="3" />
        <circle cx="12" cy="20" r="3" />
        <path
          fillRule="evenodd"
          d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
        />
      </>
    ),
  },
  {
    id: "assistant",
    label: "AI assistants",
    description:
      "Help visitors find answers to common questions and guide enquiries toward a useful next step, with a handoff to your team.",
    icon: (
      <path
        fillRule="evenodd"
        d="M11 2h2v3h5a4 4 0 0 1 4 4v8a3 3 0 0 1-3 3h-9l-5 3v-3.2A4 4 0 0 1 2 16V9a4 4 0 0 1 4-4h5V2Zm-4 8v4h3v-4H7Zm7 0v4h3v-4h-3Z"
      />
    ),
  },
  {
    id: "custom",
    label: "Custom software",
    description:
      "Build a focused tool around your business process when existing software makes everyday work harder than it needs to be.",
    icon: (
      <>
        <path d="M7.4 5.5 1.7 11a1.4 1.4 0 0 0 0 2l5.7 5.5 2-2.1L4.9 12l4.5-4.4-2-2.1Zm9.2 0-2 2.1 4.5 4.4-4.5 4.4 2 2.1 5.7-5.5a1.4 1.4 0 0 0 0-2l-5.7-5.5Z" />
        <rect x="10.5" y="3" width="3" height="18" rx="1.5" transform="rotate(15 12 12)" />
      </>
    ),
  },
];

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
      <span className={styles.beaconPip} aria-hidden="true" />
      <div className={styles.iconWrapper}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="currentColor"
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
  const [dimensions, setDimensions] = useState({ width: 510, height: 330 });
  const [hovered, setHovered] = useState<NodeKey | null>(null);
  const [focused, setFocused] = useState<NodeKey | null>(null);
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const activeNode = hovered ?? focused ?? selected;
  const activeMeta = [...challenges, ...solutions].find((node) => node.id === activeNode);
  const related = activeNode
    ? (relationships[activeNode] ??
      challenges
        .filter((node) => relationships[node.id]?.includes(activeNode))
        .map((node) => node.id))
    : [];
  const routeTitle = activeMeta?.label;

  // Track the actual rendered dimensions of the graph area so that the SVG coordinate system
  // matches pixel-for-pixel (1:1). This eliminates any non-uniform horizontal stretching,
  // guaranteeing that all particles and dashes remain perfectly round circles on all viewports!
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getReticleRotation = () => {
    const index = [...challenges, ...solutions].findIndex((node) => node.id === activeNode);
    return index < 0
      ? "0deg"
      : ["-45deg", "-20deg", "20deg", "45deg", "45deg", "20deg", "-20deg", "-45deg"][index];
  };

  const isSmall = dimensions.height <= 310 || dimensions.width <= 640;
  const startX = isSmall ? 26 : 30;
  const endX = dimensions.width - startX;
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const yOffsets = isSmall ? [26, 109, 191, 274] : [30, 120, 210, 300];

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
        <span>Business challenges</span>
        <span>Technology solutions</span>
      </div>

      <div ref={graphRef} className={styles.graphArea}>
        <svg
          className={styles.svgNetwork}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="flowCoralToLime" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#fb923c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c6f432" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="flowAmberToLime" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#facc15" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c6f432" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="flowLimeToGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c6f432" stopOpacity="1" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="flowLimeToCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c6f432" stopOpacity="1" />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
            </linearGradient>
            <filter id="flowBeamGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="flowParticleGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
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
                    ? index % 2 === 1
                      ? "url(#flowAmberToLime)"
                      : "url(#flowCoralToLime)"
                    : index === 3
                      ? "url(#flowLimeToCyan)"
                      : "url(#flowLimeToGreen)"
                  : undefined;

              return (
                <g key={node.id}>
                  {/* Subtle geometric blueprint rail */}
                  <path className={styles.railTrack} d={path} vectorEffect="non-scaling-stroke" />

                  {/* Soft volumetric glow corridor */}
                  <path
                    className={styles.glowCorridor}
                    d={path}
                    stroke={strokeGradient ?? (side === 0 ? "var(--coral)" : "var(--lime)")}
                    data-emphasis={emphasis}
                    data-side={side === 0 ? "problem" : "solution"}
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Primary flow connector (targeted by e2e tests) */}
                  <path
                    data-node={node.id}
                    data-side={side === 0 ? "problem" : "solution"}
                    data-tone={side === 0 && index % 2 === 1 ? "amber" : "coral"}
                    data-emphasis={emphasis}
                    className={styles.connector}
                    d={path}
                    stroke={strokeGradient}
                    filter={emphasis === "active" ? "url(#flowBeamGlow)" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Secondary trailing pulse for smooth fluid motion */}
                  <circle
                    className={styles.particleTrail}
                    data-side={side === 0 ? "problem" : "solution"}
                    data-tone={side === 0 && index % 2 === 1 ? "amber" : "coral"}
                    data-emphasis={emphasis}
                    r={emphasis === "active" ? (side === 0 ? 3.2 : 3.8) : 2.2}
                  >
                    <animateMotion
                      path={path}
                      dur={(side === 0 ? 2.4 : 1.1) + index * 0.12 + "s"}
                      begin={index * -0.5 + (side === 0 ? 0.35 : 0.22) + "s"}
                      calcMode={side === 0 ? "spline" : "paced"}
                      keyPoints={side === 0 ? "0;0.35;0.65;1" : undefined}
                      keyTimes={side === 0 ? "0;0.3;0.65;1" : undefined}
                      keySplines={side === 0 ? "0.4 0 0.8 1;0.2 0 0.8 1;0.2 0 0.6 1" : undefined}
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Primary traveling photonic particle (targeted by tests) */}
                  <circle
                    className={styles.particle}
                    data-side={side === 0 ? "problem" : "solution"}
                    data-tone={side === 0 && index % 2 === 1 ? "amber" : "coral"}
                    data-emphasis={emphasis}
                    filter={emphasis === "active" ? "url(#flowParticleGlow)" : undefined}
                    r={emphasis === "active" ? (side === 0 ? 5 : 5.8) : side === 0 ? 3.4 : 4}
                  >
                    <animateMotion
                      path={path}
                      dur={(side === 0 ? 2.4 : 1.1) + index * 0.12 + "s"}
                      begin={index * -0.5 + "s"}
                      calcMode={side === 0 ? "spline" : "paced"}
                      keyPoints={side === 0 ? "0;0.35;0.65;1" : undefined}
                      keyTimes={side === 0 ? "0;0.3;0.65;1" : undefined}
                      keySplines={side === 0 ? "0.4 0 0.8 1;0.2 0 0.8 1;0.2 0 0.6 1" : undefined}
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

              {/* Kinetic Outer Precision Dial */}
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

              {/* Interactive Focusing Reticle Ring */}
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

              {/* Central Aperture Core Tile */}
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

            {/* Pure Wordmark */}
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
        data-side={
          activeMeta && challenges.some((c) => c.id === activeMeta.id) ? "problem" : "solution"
        }
      >
        <div className={styles.description}>
          <div className={styles.sizingCopy} aria-hidden="true">
            <p className={styles.message}>
              <strong>See how the dots connect.</strong>
              <span>
                Explore how Clarteon turns business challenges into technology solutions. Select an
                icon to learn more.
              </span>
            </p>
            {[...challenges, ...solutions].map((node) => (
              <p key={node.id} className={styles.message}>
                <strong>{node.label}</strong>
                <span>{node.description}</span>
              </p>
            ))}
          </div>
          <div id={descriptionId} role="status" aria-live="polite" aria-atomic="true">
            {activeMeta ? (
              <p key={activeMeta.id} className={styles.message}>
                <strong>{routeTitle}</strong>
                <span>{activeMeta.description}</span>
              </p>
            ) : (
              <p className={styles.message}>
                <strong>See how the dots connect.</strong>
                <span>
                  Explore how Clarteon turns business challenges into technology solutions. Select
                  an icon to learn more.
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
