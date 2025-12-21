'use client';

import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function DataSourceNode({ data, id }: NodeProps<{ exchange?: string, symbol?: string }>) {
  const { setNodes } = useReactFlow();

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
    <div className="bg-slate-800 border-2 border-slate-400 border-l-4 border-l-yellow-500 rounded-lg shadow-xl w-64 text-white">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-yellow-400" />
            <div className="font-bold">Veri Kaynağı</div>
        </div>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor={`${id}-exchange`}>Borsa</Label>
            <Select 
              defaultValue={data.exchange || 'binance'} 
              onValueChange={(value) => updateNodeData('exchange', value)}
            >
                <SelectTrigger id={`${id}-exchange`} className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="kraken" disabled>Kraken (Yakında)</SelectItem>
                    <SelectItem value="coinbase" disabled>Coinbase (Yakında)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor={`${id}-symbol`}>Sembol</Label>
            <Input 
              id={`${id}-symbol`} 
              type="text" 
              defaultValue={data.symbol || 'BTC/USDT'} 
              onChange={(e) => updateNodeData('symbol', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white" 
            />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-yellow-400 w-3 h-3" />
    </div>
  );
}
