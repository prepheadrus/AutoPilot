'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Rss } from 'lucide-react';

export function IndicatorNode({ data }: NodeProps) {
  return (
    <div className="bg-slate-800/80 border border-teal-500 rounded-lg shadow-xl w-64 text-white backdrop-blur-sm">
      <div className="p-3 border-b border-teal-500/50">
        <div className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-teal-400" />
            <div className="font-bold">Indicator</div>
        </div>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor="indicator-type">Indicator Type</Label>
            <Select defaultValue="rsi">
                <SelectTrigger id="indicator-type" className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="rsi">RSI</SelectItem>
                    <SelectItem value="sma">SMA</SelectItem>
                    <SelectItem value="ema">EMA</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Input id="period" type="number" defaultValue={14} className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-teal-400 w-3 h-3" />
    </div>
  );
}
