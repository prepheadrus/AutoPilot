'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch } from 'lucide-react';

export function LogicNode({ data }: NodeProps) {
  return (
    <div className="bg-slate-800/80 border border-blue-500 rounded-lg shadow-xl w-64 text-white backdrop-blur-sm">
      <div className="p-3 border-b border-blue-500/50">
        <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-400" />
            <div className="font-bold">Logic</div>
        </div>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <Select defaultValue="gt">
                <SelectTrigger id="operator" className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                    <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                    <SelectItem value="crossover">CrossOver</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-blue-400 w-3 h-3" />
      <Handle type="source" position={Position.Right} className="!bg-blue-400 w-3 h-3" />
    </div>
  );
}
