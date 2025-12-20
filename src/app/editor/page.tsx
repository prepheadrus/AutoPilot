"use client";

import React, { useState, useCallback } from "react";
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { compileStrategy } from "@/lib/compiler";
import { Code, GitBranch, Rss, CircleDollarSign, TrendingUp, Filter, Save, Share2 } from "lucide-react";
import { IndicatorNode } from "@/components/editor/nodes/IndicatorNode";
import { LogicNode } from "@/components/editor/nodes/LogicNode";
import { ActionNode } from "@/components/editor/nodes/ActionNode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const nodeTypes = {
  indicator: IndicatorNode,
  logic: LogicNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  { id: "1", type: "indicator", position: { x: 50, y: 150 }, data: {} },
  { id: "2", type: "logic", position: { x: 400, y: 150 }, data: {} },
  { id: "3", type: "action", position: { x: 750, y: 150 }, data: {} },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { strokeWidth: 2, stroke: '#60a5fa' } },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { strokeWidth: 2, stroke: '#a78bfa' } },
];


export default function EditorPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { toast } = useToast();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  let nodeIdCounter = 4;
  const getNewNodeId = () => `${nodeIdCounter++}`;

  const nodeTemplates = [
      { id: 'indicator', label: 'Indicator', icon: Rss, type: 'indicator' },
      { id: 'logic', label: 'Logic', icon: GitBranch, type: 'logic' },
      { id: 'action', label: 'Action', icon: CircleDollarSign, type: 'action' },
      { id: 'price_filter', label: 'Price Filter', icon: Filter, type: 'default' },
      { id: 'trend_filter', label: 'Trend Filter', icon: TrendingUp, type: 'default' },
  ];

  const addNode = (nodeTemplate: typeof nodeTemplates[0]) => {
    const newNode: Node = {
      id: getNewNodeId(),
      type: nodeTemplate.type,
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 300 + 50,
      },
      data: { label: nodeTemplate.label },
    };
    setNodes((nds) => nds.concat(newNode));
  };
  
  const handleCompile = () => {
    try {
      const jsonStrategy = compileStrategy(nodes, edges);
      console.log(jsonStrategy);
      toast({
        title: "Strategy Compiled Successfully",
        description: (
          <ScrollArea className="h-40 mt-2">
            <pre className="mt-2 w-[340px] rounded-md bg-black/80 p-4">
              <code className="text-white">{jsonStrategy}</code>
            </pre>
          </ScrollArea>
        ),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Compilation Failed",
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] -m-4 md:-m-6">
      <div className="flex-grow rounded-lg text-card-foreground w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-card"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls />
        </ReactFlow>
        <div className="absolute top-4 left-4">
            <Card className="w-72">
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Strategy: RSI Momentum</CardTitle>
                    <CardDescription>Buys when RSI is oversold.</CardDescription>
                </CardHeader>
            </Card>
        </div>
        <div className="absolute top-4 right-4 space-x-2">
            <Button onClick={handleCompile} variant="outline"><Code className="mr-2 h-4 w-4" /> Compile</Button>
            <Button><Save className="mr-2 h-4 w-4" /> Save & Deploy</Button>
        </div>
        <div className="absolute bottom-4 left-4 space-y-2">
            {nodeTemplates.map(nodeType => (
              <Button key={nodeType.id} variant="secondary" size="sm" className="w-full justify-start" onClick={() => addNode(nodeType)}>
                <nodeType.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                Add {nodeType.label}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
