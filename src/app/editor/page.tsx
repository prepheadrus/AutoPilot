"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Code, Rss, GitBranch, CircleDollarSign } from "lucide-react";
import { IndicatorNode } from "@/components/editor/nodes/IndicatorNode";
import { LogicNode } from "@/components/editor/nodes/LogicNode";
import { ActionNode } from "@/components/editor/nodes/ActionNode";

const nodeTypes = {
  indicator: IndicatorNode,
  logic: LogicNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  { id: "1", type: "indicator", position: { x: 100, y: 200 }, data: { label: 'RSI İndikatörü' } },
  { id: "2", type: "logic", position: { x: 400, y: 200 }, data: { label: 'Değer 30 dan küçükse' } },
  { id: "3", type: "action", position: { x: 700, y: 200 }, data: { label: '100 USDT Al' } },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { strokeWidth: 2 } },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { strokeWidth: 2 } },
];

let nodeIdCounter = 4;
const getNewNodeId = () => `${nodeIdCounter++}`;

export default function EditorPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const handleAddNode = (type: 'indicator' | 'logic' | 'action') => {
    let label = "Yeni Düğüm";
    if (type === 'indicator') label = "Yeni İndikatör";
    if (type === 'logic') label = "Koşul";
    if (type === 'action') label = "İşlem";

    const newNode: Node = {
      id: getNewNodeId(),
      type: type,
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 300 + 50,
      },
      data: { label },
    };
    setNodes((nds) => nds.concat(newNode));
  };
  
  const handleCompile = () => {
    if (nodes.length === 0) {
      alert("Hata: Tuval boş!");
      return;
    }
    if (edges.length === 0) {
      alert("Hata: Düğümler arasında bağlantı yok!");
      return;
    }

    // Basic validation logic
    const indicatorNode = nodes.find(n => n.type === 'indicator');
    const logicNode = nodes.find(n => n.type === 'logic');
    const actionNode = nodes.find(n => n.type === 'action');
    
    if (indicatorNode && logicNode && actionNode && edges.some(e => e.source === indicatorNode.id && e.target === logicNode.id) && edges.some(e => e.source === logicNode.id && e.target === actionNode.id)) {
        console.log("Strateji Hazır:", { nodes, edges });
        alert("Başarılı: Strateji bot için hazır!");
    } else {
        alert("Hata: Akış mantıklı değil. Lütfen İndikatör -> Mantık -> İşlem şeklinde bağlayın.");
    }
  };

  return (
    <div className="w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls />
        </ReactFlow>

        <div className="absolute top-4 left-4 z-10 bg-card border p-2 rounded-lg shadow-xl flex flex-col gap-2 w-56">
            <h3 className="text-md font-headline font-semibold px-2">Araçlar</h3>
             <p className="text-xs text-muted-foreground px-2 pb-2">Stratejinizi oluşturmak için düğümleri tuvale ekleyin.</p>
            <Button variant="outline" className="justify-start" onClick={() => handleAddNode('indicator')}>
                <Rss className="mr-2 h-4 w-4 text-primary" /> İndikatör Ekle
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleAddNode('logic')}>
                <GitBranch className="mr-2 h-4 w-4 text-primary" /> Mantık Ekle
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleAddNode('action')}>
                <CircleDollarSign className="mr-2 h-4 w-4 text-primary" /> İşlem Ekle
            </Button>
        </div>

        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button onClick={handleCompile} variant="default" className="shadow-lg">
                <Code className="mr-2 h-4 w-4" /> Derle
            </Button>
        </div>
    </div>
  );
}
