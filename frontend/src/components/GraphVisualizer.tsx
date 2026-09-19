import React, { useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { BlastRadiusReport, ChangedSymbol } from "../types/analysis";
import { 
  GitCommit, 
  Search, 
  Filter, 
  Code2, 
  ShieldAlert 
} from "lucide-react";

interface GraphVisualizerProps {
  blastRadius: BlastRadiusReport;
  changedSymbols: ChangedSymbol[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

// --- Custom Node Components ---

const ChangedSymbolNode: React.FC<{ data: { label: string; file: string; breaking: boolean } }> = ({ data }) => {
  return (
    <div className="rounded-lg border-2 border-rose-500 bg-surface-raised p-3 shadow-xl shadow-rose-950/40 min-w-[220px]">
      <Handle type="target" position={Position.Top} className="!bg-rose-500" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
          <GitCommit className="h-2.5 w-2.5" /> Changed Source
        </span>
        {data.breaking && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
            BREAKING
          </span>
        )}
      </div>
      <div className="font-mono text-xs font-bold text-white truncate" title={data.label}>
        {data.label}
      </div>
      <div className="mt-1 text-[11px] text-slate-400 truncate" title={data.file}>
        {data.file}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500" />
    </div>
  );
};

const ImpactedNode: React.FC<{
  data: { 
    label: string; 
    file: string; 
    impactType: "DIRECT" | "TRANSITIVE"; 
    depth: number;
    isSelected: boolean;
  };
}> = ({ data }) => {
  const isDirect = data.impactType === "DIRECT";
  const borderClass = isDirect ? "border-orange-500" : "border-purple-500";
  const badgeClass = isDirect ? "bg-orange-500/20 text-orange-400" : "bg-purple-500/20 text-purple-400";
  const glowClass = data.isSelected ? "ring-2 ring-accent" : "";

  return (
    <div className={`rounded-lg border-2 ${borderClass} bg-surface-raised p-3 shadow-lg min-w-[220px] transition-all ${glowClass}`}>
      <Handle type="target" position={Position.Top} className={isDirect ? "!bg-orange-500" : "!bg-purple-500"} />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {isDirect ? "Direct Impact" : `Transitive (Hop ${data.depth})`}
        </span>
        <span className="text-[10px] font-mono text-slate-400">Depth {data.depth}</span>
      </div>
      <div className="font-mono text-xs font-semibold text-slate-100 truncate" title={data.label}>
        {data.label}
      </div>
      <div className="mt-1 text-[11px] text-slate-400 truncate" title={data.file}>
        {data.file}
      </div>
      <Handle type="source" position={Position.Bottom} className={isDirect ? "!bg-orange-500" : "!bg-purple-500"} />
    </div>
  );
};

const FileNode: React.FC<{ data: { label: string } }> = ({ data }) => {
  return (
    <div className="rounded-lg border border-slate-700 bg-surface p-3 shadow min-w-[180px]">
      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
        <Code2 className="h-3.5 w-3.5 text-slate-400" />
        <span className="truncate">{data.label}</span>
      </div>
    </div>
  );
};

const nodeTypes = {
  changedSymbol: ChangedSymbolNode,
  impactedEntity: ImpactedNode,
  fileNode: FileNode,
};

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  blastRadius,
  changedSymbols,
  selectedNodeId,
  onSelectNode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxFilterDepth, setMaxFilterDepth] = useState<number>(blastRadius.max_depth_reached || 5);

  // Compute React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];
    const changedIds = new Set(blastRadius.changed_symbol_ids);
    const impactedMap = new Map(blastRadius.impacted_entities.map((e) => [e.entity_id, e]));

    // If no nodes, return empty
    if (blastRadius.subgraph_nodes.length === 0) {
      return result;
    }

    // Determine layout columns by depth
    const nodesByDepth: Record<number, typeof blastRadius.subgraph_nodes> = {};

    blastRadius.subgraph_nodes.forEach((n) => {
      let depth = 0;
      if (impactedMap.has(n.id)) {
        depth = impactedMap.get(n.id)!.depth;
      }
      if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
      nodesByDepth[depth].push(n);
    });

    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 120;

    Object.entries(nodesByDepth).forEach(([depthStr, depthNodes]) => {
      const depth = parseInt(depthStr, 10);
      if (depth > maxFilterDepth) return;

      depthNodes.forEach((n, idx) => {
        const isChanged = changedIds.has(n.id);
        const impacted = impactedMap.get(n.id);

        const xPos = depth * HORIZONTAL_SPACING + 60;
        const yPos = idx * VERTICAL_SPACING + 80;

        const isFilteredOut = searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase());
        if (isFilteredOut) return;

        if (isChanged) {
          const changedDef = changedSymbols.find((s) => s.entity_id === n.id);
          result.push({
            id: n.id,
            type: "changedSymbol",
            position: { x: xPos, y: yPos },
            data: {
              label: n.label,
              file: n.file_path,
              breaking: changedDef?.is_breaking_candidate || false,
            },
            selected: selectedNodeId === n.id,
          });
        } else if (impacted) {
          result.push({
            id: n.id,
            type: "impactedEntity",
            position: { x: xPos, y: yPos },
            data: {
              label: n.label,
              file: n.file_path,
              impactType: impacted.impact_type,
              depth: impacted.depth,
              isSelected: selectedNodeId === n.id,
            },
            selected: selectedNodeId === n.id,
          });
        } else {
          result.push({
            id: n.id,
            type: "fileNode",
            position: { x: xPos, y: yPos },
            data: { label: n.label },
            selected: selectedNodeId === n.id,
          });
        }
      });
    });

    return result;
  }, [blastRadius, changedSymbols, selectedNodeId, maxFilterDepth, searchQuery]);

  // Compute React Flow Edges
  const edges: Edge[] = useMemo(() => {
    return blastRadius.subgraph_edges.map((e, idx) => {
      const isSelected =
        selectedNodeId && (e.source_id === selectedNodeId || e.target_id === selectedNodeId);

      return {
        id: `e-${idx}-${e.source_id}-${e.target_id}`,
        source: e.source_id,
        target: e.target_id,
        label: e.relation_type,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: isSelected ? "#58a6ff" : "#8b949e",
          strokeWidth: isSelected ? 2.5 : 1.5,
        },
        labelStyle: { fill: "#8b949e", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: "#161b22", fillOpacity: 0.8 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSelected ? "#58a6ff" : "#8b949e",
          width: 16,
          height: 16,
        },
      };
    });
  }, [blastRadius.subgraph_edges, selectedNodeId]);

  return (
    <div className="relative h-full w-full bg-background rounded-xl border border-border overflow-hidden flex flex-col">
      {/* Top Filter & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 z-10 text-xs">
        {/* Left: Search & Depth */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:border-accent focus:outline-none w-44"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-3">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Max Depth:</span>
            <input
              type="range"
              min="1"
              max={Math.max(1, blastRadius.max_depth_reached || 3)}
              value={maxFilterDepth}
              onChange={(e) => setMaxFilterDepth(parseInt(e.target.value, 10))}
              className="w-20 accent-accent cursor-pointer"
            />
            <span className="font-mono text-slate-200 font-bold">{maxFilterDepth}</span>
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
            <span className="text-slate-300">Changed Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-300">Direct Impact (1 Hop)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-300">Transitive Impact (2+ Hops)</span>
          </div>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full relative min-h-[420px]">
        {nodes.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-emerald-400 mb-2" />
            <p className="text-sm font-semibold text-slate-200">Zero Downstream Blast Radius</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              The changes in this pull request do not propagate to any executable callers or downstream services.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            onPaneClick={() => onSelectNode(null)}
            fitView
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#21262d" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "changedSymbol") return "#f43f5e";
                if (node.type === "impactedEntity") {
                  return node.data?.impactType === "DIRECT" ? "#f97316" : "#a855f7";
                }
                return "#64748b";
              }}
              maskColor="rgba(13, 17, 23, 0.7)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
