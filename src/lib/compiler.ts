import type { Node, Edge } from '@xyflow/react';

export function compileStrategy(nodes: Node[], edges: Edge[]): string {
    if (nodes.length < 2) {
        throw new Error("A strategy must have at least an input and an output node.");
    }

    const inputNode = nodes.find(node => node.type === 'input');
    const outputNode = nodes.find(node => node.type === 'output');

    if (!inputNode) {
        throw new Error("Strategy must contain an Input node.");
    }
    if (!outputNode) {
        throw new Error("Strategy must contain an Output node.");
    }
    
    const strategy = {
        meta: {
            compiledAt: new Date().toISOString(),
        },
        nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            label: node.data.label,
            position: node.position
        })),
        connections: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
        }))
    };

    return JSON.stringify(strategy, null, 2);
}
