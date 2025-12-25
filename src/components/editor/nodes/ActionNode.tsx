'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CircleDollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActionNode({ data, id }: NodeProps<{ label: string, actionType?: string }>) {
  const { setNodes, getNodes, setEdges } = useReactFlow();
  const [action, setAction] = useState(data.actionType || 'buy');

  const updateNodeData = useCallback((newData: object) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, ...newData };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  useEffect(() => {
    updateNodeData({ actionType: action });
  }, [action, updateNodeData]);
  
  const handleDelete = useCallback(() => {
    setNodes(nodes => nodes.filter(n => n.id !== id));
    setEdges(edges => edges.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);


  const borderColor = action === 'buy' ? 'border-l-green-500' : 'border-l-red-500';
  const iconColor = action === 'buy' ? 'text-green-400' : 'text-red-400';

  return (
    <div className={cn("bg-slate-800 border-2 border-slate-400 border-l-4 rounded-lg shadow-xl w-64 text-white", borderColor)}>
        <div className="p-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <CircleDollarSign className={cn("h-5 w-5", iconColor)} />
                <div className="font-bold">İşlem</div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:bg-slate-700 hover:text-white" onClick={handleDelete}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor={`${id}-action-type`}>İşlem</Label>
            <Select value={action} onValueChange={setAction}>
                <SelectTrigger id={`${id}-action-type`} className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="İşlem seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="buy">Al</SelectItem>
                    <SelectItem value="sell">Sat</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className={cn("w-3 h-3", action === 'buy' ? '!bg-green-400' : '!bg-red-400')} />
    </div>
  );
}
