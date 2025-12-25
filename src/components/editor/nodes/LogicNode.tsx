'use client';

import React, { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LogicNode({ data, id }: NodeProps<{ operator?: string, value?: number }>) {
    const { setNodes, setEdges } = useReactFlow();

    const updateNodeData = useCallback((key: string, value: any) => {
        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id === id) {
              node.data = { ...node.data, [key]: value };
            }
            return node;
          })
        );
    }, [id, setNodes]);
    
    const handleDelete = useCallback(() => {
        setNodes(nodes => nodes.filter(n => n.id !== id));
        setEdges(edges => edges.filter(e => e.source !== id && e.target !== id));
    }, [id, setNodes, setEdges]);

  return (
    <div className="bg-slate-800 border-2 border-slate-400 border-l-4 border-l-purple-500 rounded-lg shadow-xl w-64 text-white">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-purple-400" />
            <div className="font-bold">Mantık / Koşul</div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:bg-slate-700 hover:text-white" onClick={handleDelete}>
            <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor={`${id}-operator`}>Operatör</Label>
            <Select 
                value={data.operator || 'lt'} 
                onValueChange={(value) => updateNodeData('operator', value)}
            >
                <SelectTrigger id={`${id}-operator`} className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Operatör seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="gt">Büyüktür (&gt;)</SelectItem>
                    <SelectItem value="lt">Küçüktür (&lt;)</SelectItem>
                    <SelectItem value="crossover">Kesişim (Yakında)</SelectItem>
                </SelectContent>
            </Select>
        </div>
         <div className="space-y-2">
            <Label htmlFor={`${id}-value`}>Değer</Label>
            <Input 
                id={`${id}-value`} 
                type="number" 
                value={data.value || 30} 
                onChange={(e) => updateNodeData('value', parseInt(e.target.value, 10))} 
                className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-purple-400 w-3 h-3" />
      <Handle type="source" position={Position.Right} className="!bg-purple-400 w-3 h-3" />
    </div>
  );
}
