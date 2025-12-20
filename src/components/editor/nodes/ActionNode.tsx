'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActionNode({ data }: NodeProps) {
  const [action, setAction] = useState('buy');

  const borderColor = action === 'buy' ? 'border-l-green-500' : 'border-l-red-500';
  const iconColor = action === 'buy' ? 'text-green-400' : 'text-red-400';

  return (
    <div className={cn("bg-slate-800 border-2 border-slate-400 border-l-4 rounded-lg shadow-xl w-64 text-white", borderColor)}>
        <div className="p-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
                <CircleDollarSign className={cn("h-5 w-5", iconColor)} />
                <div className="font-bold">Action</div>
            </div>
        </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor="action-type">Action</Label>
            <Select defaultValue="buy" onValueChange={setAction}>
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
      <Handle type="target" position={Position.Left} className={cn("w-3 h-3", action === 'buy' ? '!bg-green-400' : '!bg-red-400')} />
    </div>
  );
}
