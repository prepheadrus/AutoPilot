'use client';

import React, { useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Rss } from 'lucide-react';

export function IndicatorNode({ data, id }: NodeProps<{ indicatorType?: string, period?: number }>) {
  const { setNodes } = useReactFlow();

  // Helper to update node data
  const updateNodeData = (key: string, value: any) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, [key]: value };
        }
        return node;
      })
    );
  };
  
  return (
    <div className="bg-slate-800 border-2 border-slate-400 border-l-4 border-l-blue-500 rounded-lg shadow-xl w-64 text-white">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-blue-400" />
            <div className="font-bold">İndikatör</div>
        </div>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor={`${id}-indicator-type`}>İndikatör Tipi</Label>
            <Select 
              defaultValue={data.indicatorType || 'rsi'} 
              onValueChange={(value) => updateNodeData('indicatorType', value)}
            >
                <SelectTrigger id={`${id}-indicator-type`} className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="İndikatör seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="rsi">RSI</SelectItem>
                    <SelectItem value="sma">SMA</SelectItem>
                    <SelectItem value="ema">EMA</SelectItem>
                    <SelectItem value="macd">MACD (Yakında)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor={`${id}-period`}>Periyot</Label>
            <Input 
              id={`${id}-period`} 
              type="number" 
              defaultValue={data.period || 14} 
              onChange={(e) => updateNodeData('period', parseInt(e.target.value, 10))}
              className="bg-slate-700 border-slate-600 text-white" 
            />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-400 w-3 h-3" />
    </div>
  );
}

    