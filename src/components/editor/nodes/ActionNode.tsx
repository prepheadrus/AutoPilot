'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CircleDollarSign } from 'lucide-react';

export function ActionNode({ data }: NodeProps) {
  return (
    <div className="bg-slate-800/80 border border-purple-500 rounded-lg shadow-xl w-64 text-white backdrop-blur-sm">
        <div className="p-3 border-b border-purple-500/50">
            <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-purple-400" />
                <div className="font-bold">Action</div>
            </div>
        </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor="action-type">Action</Label>
            <Select defaultValue="buy">
                <SelectTrigger id="action-type" className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDT)</Label>
            <Input id="amount" type="number" defaultValue={100} className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-purple-400 w-3 h-3" />
    </div>
  );
}
