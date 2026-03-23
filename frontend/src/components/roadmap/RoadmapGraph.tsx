import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export type RoadmapNode = {
  id: string;
  label: string;
  type: "category" | "course";
};

export type RoadmapLink = {
  source: string;
  target: string;
};

type Props = {
  nodes: RoadmapNode[];
  links: RoadmapLink[];
  onCourseClick: (id: string) => void;
};

type NodeDatum = RoadmapNode & { x?: number; y?: number };

type LinkDatum = {
  source: string | NodeDatum;
  target: string | NodeDatum;
};

export default function RoadmapGraph({ nodes, links, onCourseClick }: Props) {
  const graphRef = useRef<any>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [hoverLabel, setHoverLabel] = useState<string>("");

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();

    nodes.forEach((node) => map.set(node.id, new Set([node.id])));

    links.forEach((link) => {
      const s = String(link.source);
      const t = String(link.target);
      if (!map.has(s)) map.set(s, new Set([s]));
      if (!map.has(t)) map.set(t, new Set([t]));
      map.get(s)?.add(t);
      map.get(t)?.add(s);
    });

    return map;
  }, [links, nodes]);

  const isHighlighted = (id: string) => highlightIds.size === 0 || highlightIds.has(id);

  const handleNodeClick = (node: NodeDatum) => {
    if (node.type === "course") {
      onCourseClick(node.id);
      return;
    }

    const connected = adjacency.get(node.id) || new Set([node.id]);
    setHighlightIds(new Set(connected));

    if (graphRef.current && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, 700);
      graphRef.current.zoom(2.1, 700);
    }
  };

  return (
    <div className="relative h-[560px] overflow-hidden rounded-2xl border border-border bg-card">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        cooldownTicks={90}
        d3VelocityDecay={0.25}
        nodeRelSize={7}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.003}
        onNodeClick={(node) => handleNodeClick(node as NodeDatum)}
        onNodeHover={(node) => setHoverLabel((node as NodeDatum)?.label || "")}
        onBackgroundClick={() => setHighlightIds(new Set())}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as NodeDatum;
          const highlighted = isHighlighted(n.id);
          const radius = highlighted ? 7 : 5;
          const fontSize = Math.max(12 / globalScale, 3.2);

          ctx.beginPath();
          ctx.arc(n.x || 0, n.y || 0, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = highlighted
            ? n.type === "course"
              ? "#22c55e"
              : "#3b82f6"
            : "#94a3b8";
          ctx.fill();

          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = highlighted ? "#0f172a" : "#64748b";
          ctx.fillText(n.label, n.x || 0, (n.y || 0) - 13);
        }}
        linkColor={(link) => {
          const l = link as LinkDatum;
          const sourceId = typeof l.source === "string" ? l.source : l.source.id;
          const targetId = typeof l.target === "string" ? l.target : l.target.id;
          return isHighlighted(sourceId) && isHighlighted(targetId) ? "#93c5fd" : "#cbd5e1";
        }}
      />

      {hoverLabel ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-100">
          {hoverLabel}
        </div>
      ) : null}

      {highlightIds.size > 0 ? (
        <button
          type="button"
          onClick={() => setHighlightIds(new Set())}
          className="absolute bottom-4 right-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Reset Highlight
        </button>
      ) : null}
    </div>
  );
}
