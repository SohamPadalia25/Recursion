import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { StudentProgressGraph, GraphNode } from "@/lib/neo4j-api";

interface ProgressGraphVizProps {
    data: StudentProgressGraph;
    height?: number;
    onNodeClick?: (node: GraphNode) => void;
}

export function ProgressGraphViz({
    data,
    height = 600,
    onNodeClick,
}: ProgressGraphVizProps) {
    const fgRef = useRef<any>(null);

    useEffect(() => {
        if (!fgRef.current || !data.nodes.length) return;

        // Center camera on graph
        const graph = fgRef.current;
        setTimeout(() => {
            graph.zoomToFit(400, 50);
        }, 300);
    }, [data]);

    const handleNodeClick = (node: any) => {
        if (onNodeClick) {
            onNodeClick(node);
        }
    };

    const handleBackgroundClick = () => {
        // Reset on canvas click
    };

    if (!data.nodes.length) {
        return (
            <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">No courses enrolled yet. Start learning today!</p>
            </div>
        );
    }

    // Build graph data structure
    const graphData = {
        nodes: data.nodes.map((node) => ({
            ...node,
            size: node.type === "course" ? 20 : node.type === "module" ? 15 : 10,
            val: node.type === "course" ? 20 : node.type === "module" ? 15 : 10,
            fx: undefined,
            fy: undefined,
        })),
        links: data.links,
    };

    return (
        <div className="relative rounded-lg border border-border overflow-hidden bg-background">
            <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeAutoColorBy="type"
                nodeColor={(node: any) => node.color || "#e5e7eb"}
                nodeLabel={(node: any) => `${node.label}\n${node.completionPercentage}% Complete`}
                nodeCanvasObjectMode={() => "after"}
                nodeCanvasObject={(node: any, ctx) => {
                    ctx.fillStyle = node.color || "#e5e7eb";
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
                    ctx.fill();

                    // Draw completion percentage text for courses
                    if (node.type === "course") {
                        ctx.font = "10px Arial";
                        ctx.fillStyle = "#000";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(`${node.completionPercentage}%`, node.x, node.y);
                    }

                    // Add border
                    ctx.strokeStyle = "rgba(0,0,0,0.2)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
                    ctx.stroke();
                }}
                linkColor={() => "rgba(100,100,100,0.2)"}
                linkWidth={2}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                cooldownTime={3000}
                height={height}
                width={undefined}
            />
            <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 p-3 text-sm shadow-md">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                        <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                        <span>Not Started</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
