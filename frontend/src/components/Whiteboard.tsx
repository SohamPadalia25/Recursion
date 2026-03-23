import { LiveObject } from "@liveblocks/client";
import { useRef, useState } from "react";
import {
  useHistory,
  useMutation,
  useStorage,
} from "../liveblocks.config";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

export default function Whiteboard() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [color, setColor] = useState(getRandomColor());
  const [brushSize, setBrushSize] = useState(4);
  const history = useHistory();
  const currentStrokeIdRef = useRef<string | null>(null);

  const shapeIds =
    useStorage((root) => {
      if (!root?.shapes) return [];
      return Array.from(root.shapes.keys());
    }) ?? [];

  const clearAllStrokes = useMutation(({ storage, setMyPresence }) => {
    const shapes = storage.get("shapes");
    Array.from(shapes.keys()).forEach((id) => {
      shapes.delete(id);
    });
    setMyPresence({ selectedShape: null });
  }, []);

  const onPointerDown = useMutation(
    ({ storage }, e: any) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const stroke = new LiveObject({
        points: [x, y],
        color: tool === "erase" ? "#FFFFFF" : color,
        size: tool === "erase" ? Math.max(brushSize * 2, 10) : brushSize,
      });

      storage.get("shapes").set(id, stroke);
      currentStrokeIdRef.current = id;
      setIsDrawing(true);
      history.pause();
    },
    [history, tool, color, brushSize]
  );

  const onPointerMove = useMutation(
    ({ storage }, e: any) => {
      if (!isDrawing) return;

      const id = currentStrokeIdRef.current;
      if (!id) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const stroke = storage.get("shapes").get(id);
      if (!stroke) return;

      const existing = stroke.get("points") || [];
      stroke.set("points", [...existing, x, y]);
    },
    [isDrawing]
  );

  const onPointerUp = useMutation(
    () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      currentStrokeIdRef.current = null;
      history.resume();
    },
    [isDrawing, history]
  );

  return (
    <div className="w-full h-full bg-background p-3 flex flex-col gap-3">
      <svg
        className="w-full flex-1 min-h-0 bg-white rounded-lg border border-border overflow-hidden touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onPointerDown}
      >
        {shapeIds.map((id) => (
          <Stroke key={id} id={id} />
        ))}
      </svg>

      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-md text-sm ${
            tool === "draw"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
          onClick={() => setTool("draw")}
        >
          Draw
        </button>
        <button
          className={`px-3 py-1.5 rounded-md text-sm ${
            tool === "erase"
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground"
          }`}
          onClick={() => setTool("erase")}
        >
          Erase
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 rounded border border-border bg-transparent"
          title="Stroke color"
          disabled={tool === "erase"}
        />
        <input
          type="range"
          min={2}
          max={18}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-28"
          title="Brush size"
        />
        <button className="px-3 py-1.5 rounded-md bg-destructive/80 text-destructive-foreground text-sm" onClick={clearAllStrokes}>
          Clear All
        </button>
        <button className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm" onClick={() => history.undo()}>
          Undo
        </button>
        <button className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm" onClick={() => history.redo()}>
          Redo
        </button>
      </div>
    </div>
  );
}

function Stroke({ id }: { id: string }) {
  const shape = useStorage((root) => root?.shapes?.get(id));
  if (!shape) return null;

  const points = shape.points || [];
  if (points.length < 2) return null;

  const polylinePoints = points.reduce<string[]>((acc, value, index) => {
    if (index % 2 === 0) {
      const y = points[index + 1] ?? 0;
      acc.push(`${value},${y}`);
    }
    return acc;
  }, []);

  return (
    <polyline
      points={polylinePoints.join(" ")}
      fill="none"
      stroke={shape.color}
      strokeWidth={shape.size}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}