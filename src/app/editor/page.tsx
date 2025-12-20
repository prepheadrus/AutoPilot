"use client";

import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  MarkerType
} from '@xyflow/react';

// !!! EN ÖNEMLİ KISIM: BU SATIR OLMAZSA KUTULAR GÖRÜNMEZ !!!
import '@xyflow/react/dist/style.css';

// Özel düğümlerimizi içe aktarıyoruz
import { IndicatorNode } from '@/components/editor/nodes/IndicatorNode';
import { LogicNode } from '@/components/editor/nodes/LogicNode';
import { ActionNode } from '@/components/editor/nodes/ActionNode';

// Düğüm tiplerini tanıtıyoruz
const nodeTypes = {
  indicator: IndicatorNode,
  logic: LogicNode,
  action: ActionNode,
};

// Başlangıç düğümleri (Boş gelmesin diye)
const initialNodes = [
  { 
    id: '1', 
    type: 'indicator', 
    position: { x: 50, y: 50 }, 
    data: { label: 'RSI İndikatörü' } 
  },
  { 
    id: '2', 
    type: 'action', 
    position: { x: 400, y: 50 }, 
    data: { label: 'Alış Emri' } 
  },
];

export default function StrategyEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Bağlantı yapıldığında çalışır
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  // Yeni düğüm ekleme fonksiyonu
  const addNode = (type: string) => {
    const id = Math.random().toString();
    const newNode = {
      id,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 }, // Rastgele konum
      data: { label: `Yeni ${type}` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // Derleme (Simülasyon)
  const handleCompile = () => {
    if (nodes.length === 0) {
      alert("Hata: Tuval boş! Lütfen düğüm ekleyin.");
      return;
    }
    console.log("Strateji Verisi:", { nodes, edges });
    alert(`Başarılı! ${nodes.length} düğüm ve ${edges.length} bağlantı ile strateji derlendi.`);
  };

  return (
    // Ana Kapsayıcı: Ekranı kaplar, Flex yapısı ile yan yana dizer
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      
      {/* SOL PANEL: Araçlar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-4 overflow-y-auto z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">Araçlar</h2>
          <p className="text-xs text-slate-400">Düğüm eklemek için tıklayın.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => addNode('indicator')}
            className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-800 hover:bg-blue-900/50 text-blue-200 rounded-lg transition-all text-sm font-medium text-left"
          >
            📊 İndikatör Ekle
          </button>
          
          <button 
            onClick={() => addNode('logic')}
            className="flex items-center gap-2 p-3 bg-purple-900/30 border border-purple-800 hover:bg-purple-900/50 text-purple-200 rounded-lg transition-all text-sm font-medium text-left"
          >
            ⚡ Mantık/Koşul Ekle
          </button>
          
          <button 
            onClick={() => addNode('action')}
            className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-800 hover:bg-green-900/50 text-green-200 rounded-lg transition-all text-sm font-medium text-left"
          >
            💰 İşlem (Al/Sat) Ekle
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button 
            onClick={handleCompile}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold shadow-lg transition-colors"
          >
            ▶ Stratejiyi Derle
          </button>
        </div>
      </aside>

      {/* SAĞ PANEL: Çizim Alanı (Canvas) */}
      <main className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
        >
          {/* Izgara ve Kontroller */}
          <Background color="#334155" gap={20} size={1} />
          <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
        </ReactFlow>
      </main>
    </div>
  );
}
