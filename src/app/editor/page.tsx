'use client';

import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  MarkerType,
  Node,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { RSI as RSICalculator, SMA as SMACalculator } from 'technicalindicators';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { Loader2, Rss, GitBranch, CircleDollarSign, Save, Play, Settings, X as XIcon, ArrowUp, ArrowDown, Database, Zap, CalendarIcon, History, ZoomOut } from 'lucide-react';
import { IndicatorNode } from '@/components/editor/nodes/IndicatorNode';
import { LogicNode } from '@/components/editor/nodes/LogicNode';
import { ActionNode } from '@/components/editor/nodes/ActionNode';
import { DataSourceNode } from '@/components/editor/nodes/DataSourceNode';
import type { Bot, BotConfig, BacktestRun } from '@/lib/types';
import type { TooltipProps } from 'recharts';
import { calculateMACD } from '@/lib/indicators';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addDays } from 'date-fns';


const initialNodes: Node[] = [
   {
    id: 'd1',
    type: 'dataSource',
    position: { x: -250, y: 200 },
    data: { label: 'Veri Kaynağı', exchange: 'binance', symbol: 'BTC/USDT' }
  },
  {
    id: '1',
    type: 'indicator',
    position: { x: 50, y: 100 },
    data: { indicatorType: 'rsi', period: 14 }
  },
   {
    id: '4',
    type: 'indicator',
    position: { x: 50, y: 300 },
    data: { indicatorType: 'macd', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  },
  {
    id: '2a',
    type: 'logic',
    position: { x: 350, y: 100 },
    data: { logicType: 'compare', operator: 'lt', value: 30, input: 'value' }
  },
   {
    id: '2b',
    type: 'logic',
    position: { x: 350, y: 300 },
    data: { logicType: 'compare', operator: 'gt', value: 0, input: 'histogram' }
  },
  {
    id: '5',
    type: 'logic',
    position: { x: 600, y: 200 },
    data: { logicType: 'AND' }
  },
  {
    id: '3a',
    type: 'action',
    position: { x: 850, y: 200 },
    data: { actionType: 'buy' }
  },
];

const initialEdges: Edge[] = [
  { id: 'ed1-1', source: 'd1', target: '1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'ed1-4', source: 'd1', target: '4', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-2a', source: '1', target: '2a', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-2b', source: '4', target: '2b', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2a-5', source: '2a', target: '5', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2b-5', source: '2b', target: '5', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e5-3a', source: '5', target: '3a', markerEnd: { type: MarkerType.ArrowClosed } },
];


const backtestFormSchema = z.object({
  symbol: z.string().min(3, "Sembol gereklidir."),
  timeframe: z.string().min(1, "Zaman dilimi gereklidir."),
  dateRange: z.object({
    from: z.date({ required_error: "Başlangıç tarihi gereklidir." }),
    to: z.date({ required_error: "Bitiş tarihi gereklidir." }),
  }),
  initialBalance: z.number().min(1, "Bakiye 0'dan büyük olmalıdır."),
  commission: z.number().min(0, "Komisyon negatif olamaz."),
  slippage: z.number().min(0, "Kayma negatif olamaz."),
});

type BacktestFormValues = z.infer<typeof backtestFormSchema>;


type BacktestResult = {
  ohlcData: any[];
  tradeData: any[];
  pnlData: any[];
  stats: {
    netProfit: number;
    totalTrades: number;
    winRate: number;
    maxDrawdown: number;
    profitFactor: number | null;
    totalCommissions: number;
  };
};

type BacktestProgress = {
    loaded: number;
    total: number;
    message: string;
}

const initialStrategyConfig: BotConfig = {
    mode: 'PAPER',
    stopLoss: 2.0,
    takeProfit: 5.0,
    trailingStop: false,
    amountType: 'fixed',
    amount: 100,
    leverage: 1,
    initialBalance: 10000,
};

const formatPrice = (price: number): string => {
    if (!price || typeof price !== 'number') return '0.00';
    if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 0.01) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return price.toPrecision(4);
};

// --- START: Backtest Engine ---

type SignalCache = { [nodeId: string]: any[] };

const runBacktestEngine = (
    ohlcv: any[],
    nodes: Node[],
    edges: Edge[],
    initialBalance: number,
    commissionRate: number,
    slippageRate: number
): BacktestResult | { error: string } => {
    
    // --- 1. Pre-calculate all indicators ---
    const prices = ohlcv.map(c => c[4]);
    const indicatorCache: SignalCache = {};
    const indicatorNodes = nodes.filter(n => n.type === 'indicator');

    indicatorNodes.forEach(node => {
        const { indicatorType, period, fastPeriod, slowPeriod, signalPeriod } = node.data;
        let result: any[] = [];
        
        try {
            if (indicatorType === 'rsi') {
                result = RSICalculator.calculate({ values: prices, period: period || 14 });
            } else if (indicatorType === 'sma' || indicatorType === 'ema') {
                result = SMACalculator.calculate({ values: prices, period: period || 20 });
            } else if (indicatorType === 'macd') {
                result = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
            }
        } catch (e) {
            console.error(`Error calculating ${indicatorType} for node ${node.id}:`, e);
            result = []; // Ensure result is an array even on error
        }

        const padding = Array(prices.length - result.length).fill(undefined);
        indicatorCache[node.id] = padding.concat(result);
    });

    // --- 2. Recursive Logic Solver ---
    const memo: { [key: string]: boolean } = {};
    const evaluateNode = (nodeId: string, candleIndex: number): boolean => {
        const memoKey = `${nodeId}-${candleIndex}`;
        if (memo[memoKey] !== undefined) return memo[memoKey];

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return false;

        const incomingEdges = edges.filter(e => e.target === nodeId);
        
        if (node.type === 'logic') {
            const { logicType } = node.data;

            if (logicType === 'compare') {
                const indicatorEdge = incomingEdges[0];
                if (!indicatorEdge) return false;
                
                const indicatorNodeId = indicatorEdge.source;
                const fullIndicatorValue = indicatorCache[indicatorNodeId]?.[candleIndex];
                if (fullIndicatorValue === undefined) return false;

                const { operator, value: thresholdValue, input: dataKey } = node.data;
                
                // Select the correct value from the indicator output (e.g., 'macd', 'histogram' or just the value itself)
                const indicatorValue = (dataKey && typeof fullIndicatorValue === 'object') 
                    ? fullIndicatorValue[dataKey] 
                    : fullIndicatorValue;
                
                if (typeof indicatorValue !== 'number') return false;

                switch (operator) {
                    case 'gt': memo[memoKey] = indicatorValue > thresholdValue; break;
                    case 'lt': memo[memoKey] = indicatorValue < thresholdValue; break;
                    default: memo[memoKey] = false;
                }
                return memo[memoKey];
            }
            
            if (logicType === 'AND') {
                if (incomingEdges.length < 2) return false; // AND needs at least 2 inputs
                const result = incomingEdges.every(edge => evaluateNode(edge.source, candleIndex));
                memo[memoKey] = result;
                return result;
            }

            if (logicType === 'OR') {
                 if (incomingEdges.length < 1) return false;
                 const result = incomingEdges.some(edge => evaluateNode(edge.source, candleIndex));
                 memo[memoKey] = result;
                 return result;
            }
        }
        
        return false;
    };

    // --- 3. Trading Simulation ---
    let inPosition = false;
    let entryPrice = 0;
    let portfolioValue = initialBalance;
    const pnlData: { time: string; pnl: number }[] = [{ time: new Date(ohlcv[0][0] - 3600*1000).toLocaleDateString('tr-TR'), pnl: portfolioValue }];
    const trades: {timestamp: number, type: 'buy' | 'sell', price: number}[] = [];
    let peakPortfolio = portfolioValue;
    let maxDrawdown = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalCommissions = 0;
    const actionNodes = nodes.filter(n => n.type === 'action');

    for (let i = 1; i < prices.length; i++) {
        const candle = ohlcv[i];
        
        // --- Find Buy/Sell decisions by evaluating action nodes ---
        let shouldBuy = false;
        const buyActionNode = actionNodes.find(n => n.data.actionType === 'buy');
        if (buyActionNode) {
            const buyEdge = edges.find(e => e.target === buyActionNode.id);
            if (buyEdge) {
                shouldBuy = evaluateNode(buyEdge.source, i);
            }
        }

        let shouldSell = false;
        const sellActionNode = actionNodes.find(n => n.data.actionType === 'sell');
        if (sellActionNode) {
            const sellEdge = edges.find(e => e.target === sellActionNode.id);
            if (sellEdge) {
                shouldSell = evaluateNode(sellEdge.source, i);
            }
        }

        const currentPrice = candle[4];
        if (shouldBuy && !inPosition) {
            const buyPrice = currentPrice * (1 + slippageRate / 100);
            const commission = portfolioValue * (commissionRate / 100);
            portfolioValue -= commission;
            totalCommissions += commission;
            
            inPosition = true;
            entryPrice = buyPrice;
            trades.push({ timestamp: candle[0], type: 'buy', price: buyPrice });
        } else if (shouldSell && inPosition) {
            const sellPrice = currentPrice * (1 - slippageRate / 100);
            const profit = (sellPrice - entryPrice) / entryPrice;
            const positionValue = portfolioValue * (1 + profit);
            const commission = positionValue * (commissionRate / 100);
            totalCommissions += commission;
            
            portfolioValue = positionValue - commission;
            
            if (profit > 0) {
                totalProfit += profit * portfolioValue;
                winningTrades++;
            } else {
                totalLoss += Math.abs(profit * portfolioValue);
                losingTrades++;
            }

            inPosition = false;
            trades.push({ timestamp: candle[0], type: 'sell', price: sellPrice });
        }

        pnlData.push({ time: new Date(candle[0]).toLocaleDateString('tr-TR'), pnl: portfolioValue });

        if (portfolioValue > peakPortfolio) {
            peakPortfolio = portfolioValue;
        }
        const drawdown = (peakPortfolio - portfolioValue) / peakPortfolio;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    const totalTrades = winningTrades + losingTrades;
    const stats = {
      netProfit: (portfolioValue - initialBalance) / initialBalance * 100,
      totalTrades: totalTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      maxDrawdown: maxDrawdown * 100,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : null,
      totalCommissions: totalCommissions
    };

    const formattedOhlc = ohlcv.map((c, i) => {
        const enrichedData: any = {
            time: new Date(c[0]).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            timestamp: c[0],
            date: new Date(c[0]),
            open: c[1], high: c[2], low: c[3], close: c[4], price: c[4]
        };
        indicatorNodes.forEach(node => {
            let key;
            const signal = indicatorCache[node.id]?.[i];
            if (node.data.indicatorType === 'macd') {
                key = `MACD(${node.data.fastPeriod || 12},${node.data.slowPeriod || 26},${node.data.signalPeriod || 9})`;
                if(typeof signal === 'object' && signal !== null) {
                    enrichedData[`${key}_MACD`] = signal.MACD;
                    enrichedData[`${key}_Signal`] = signal.signal;
                    enrichedData[`${key}_Hist`] = signal.histogram;
                }
            } else {
                key = `${node.data.indicatorType.toUpperCase()}(${node.data.period})`;
                enrichedData[key] = signal;
            }
        });
        return enrichedData;
    });

    return { ohlcData: formattedOhlc, tradeData: trades, pnlData, stats };
};
// --- END: Backtest Engine ---

const TradeArrowDot = (props: any) => {
    const { cx, cy, payload } = props;

    if (!payload || !payload.tradeMarker) {
        return null;
    }

    const isBuy = payload.tradeMarker.type === 'buy';
    const color = isBuy ? '#22c55e' : '#ef4444'; // green-500, red-500
    
    // Position arrow relative to the candle's high/low
    const arrowY = isBuy ? payload.low - Math.abs(payload.high-payload.low)*0.2 : payload.high + Math.abs(payload.high-payload.low)*0.2;
    const finalCX = cx ?? 0;

    const points = isBuy
        ? `${finalCX - 6},${arrowY + 6} ${finalCX},${arrowY} ${finalCX + 6},${arrowY + 6}` // Up arrow
        : `${finalCX - 6},${arrowY - 6} ${finalCX},${arrowY} ${finalCX + 6},${arrowY - 6}`; // Down arrow

    return (
        <g>
            <polygon
                points={points}
                fill={color}
                stroke="#000"
                strokeWidth={0.5}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))', pointerEvents: 'none' }}
            />
        </g>
    );
};


// Custom Tooltip for combined chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        return (
            <div className="p-2 bg-slate-800/80 border border-slate-700 rounded-md text-white text-xs backdrop-blur-sm">
                <p className="font-bold">{`Tarih: ${label}`}</p>
                {data.price && <p>Fiyat: <span className="font-mono">${formatPrice(data.price)}</span></p>}
                {payload.find(p => p.dataKey === 'pnl') && <p>Bakiye: <span className="font-mono">${data.pnl.toFixed(2)}</span></p>}

                {Object.keys(data)
                    .filter(key => key.includes('(') || key.includes(')'))
                    .map(key => {
                        const value = data[key];
                        if (typeof value === 'number') {
                            const displayName = key.replace(/_\w+$/, ''); // Remove _MACD, _Signal etc.
                            return <p key={key}>{displayName}: <span className="font-mono">{value.toFixed(2)}</span></p>;
                        }
                        return null;
                    })}

                {data.tradeMarker && data.tradeMarker.type && (
                    <p className={`font-bold mt-2 ${data.tradeMarker.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {data.tradeMarker.type.toUpperCase()} @ ${formatPrice(data.tradeMarker.price)}
                    </p>
                )}
            </div>
        );
    }
    return null;
};


const proOptions = { hideAttribution: true };


function StrategyEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isCompiling, setIsCompiling] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState<BacktestProgress | null>(null);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [strategyConfig, setStrategyConfig] = useState<BotConfig>(initialStrategyConfig);
  
  const [backtestHistory, setBacktestHistory] = useState<BacktestRun[]>([]);
  const [activeBacktestRun, setActiveBacktestRun] = useState<BacktestRun | null>(null);
  const activeBacktestResult = activeBacktestRun?.result || null;
  
  const [editingBotId, setEditingBotId] = useState<number | null>(null);

  const [brushTimeframe, setBrushTimeframe] = useState<any>(null);

  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataSourceNodeSymbol = useMemo(() => {
    return nodes.find(n => n.type === 'dataSource')?.data.symbol || 'BTC/USDT';
  }, [nodes]);

  const form = useForm<BacktestFormValues>({
    resolver: zodResolver(backtestFormSchema),
    defaultValues: {
      symbol: dataSourceNodeSymbol,
      timeframe: "1h",
      dateRange: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
      initialBalance: 10000,
      commission: 0.075,
      slippage: 0.05,
    }
  });

  useEffect(() => {
    // Update form's symbol when the node's symbol changes
    form.setValue('symbol', dataSourceNodeSymbol);
  }, [dataSourceNodeSymbol, form]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('backtestHistory');
        if (storedHistory) {
            const parsedHistory: BacktestRun[] = JSON.parse(storedHistory);
            setBacktestHistory(parsedHistory);
        }
    } catch (error) {
        console.error("Backtest geçmişi yüklenemedi:", error);
    }
    
    const reportId = searchParams.get('reportId');
    if (reportId) {
        try {
            const storedHistory = localStorage.getItem('backtestHistory');
            const history: BacktestRun[] = storedHistory ? JSON.parse(storedHistory) : [];
            const reportToLoad = history.find(run => run.id === Number(reportId));
            if (reportToLoad) {
                setActiveBacktestRun(reportToLoad);
                setNodes(reportToLoad.nodes || initialNodes);
                setEdges(reportToLoad.edges || initialEdges);
                setReportModalOpen(true);
            } else {
                toast({ title: "Rapor Bulunamadı", description: "Geçmiş testler arasında bu rapor bulunamadı.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Hata", description: "Rapor yüklenirken bir sorun oluştu.", variant: "destructive" });
        }
    }

  }, [searchParams, toast, setNodes, setEdges]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
        if(backtestHistory.length > 0) {
           localStorage.setItem('backtestHistory', JSON.stringify(backtestHistory));
        }
    } catch (error) {
        console.error("Backtest geçmişi kaydedilemedi:", error);
    }
  }, [backtestHistory]);


  useEffect(() => {
    const symbol = searchParams.get('symbol');
    const editBotId = searchParams.get('editBotId');
    const reportId = searchParams.get('reportId');

    if (reportId) return;

    if (editBotId) {
        try {
            const storedBotsJSON = localStorage.getItem('myBots');
            const bots: Bot[] = storedBotsJSON ? JSON.parse(storedBotsJSON) : [];
            const botToEdit = bots.find(b => b.id === Number(editBotId));

            if (botToEdit) {
                setEditingBotId(botToEdit.id);
                setNodes(botToEdit.nodes || initialNodes);
                setEdges(botToEdit.edges || initialEdges);
                setStrategyConfig(botToEdit.config || initialStrategyConfig);
                toast({
                  title: `Strateji Yüklendi: "${botToEdit.name}"`,
                  description: "Stratejiyi düzenleyip 'Kaydet' butonuna basarak güncelleyebilirsiniz.",
                });
            } else {
                 toast({ title: "Hata", description: "Düzenlenecek bot bulunamadı.", variant: 'destructive'});
                 router.push('/editor');
            }
        } catch (error) {
            toast({ title: "Hata", description: "Bot verileri yüklenirken bir sorun oluştu.", variant: 'destructive'});
            router.push('/editor');
        }
    } else if (symbol) {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.type === 'dataSource') {
            return { ...node, data: { ...node.data, symbol } };
          }
          return node;
        })
      );
    }
  }, [searchParams, setNodes, setEdges, router, toast]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );
  
  const handleOptimizePeriod = (nodeId: string) => {
    const nodeToOptimize = nodes.find(n => n.id === nodeId);
    if (!nodeToOptimize) return;

    let bestPeriod = nodeToOptimize.data.period;
    let bestProfitFactor = -Infinity;

    toast({
        title: "Optimizasyon Başlatıldı...",
        description: "Bu özellik şu anda simülasyon verisi kullanmaktadır."
    });

    for (let period = 7; period <= 30; period++) {
        const randomProfitFactor = Math.random() * 2;
        if (randomProfitFactor > bestProfitFactor) {
            bestProfitFactor = randomProfitFactor;
            bestPeriod = period;
        }
    }
    
    setNodes(nds =>
      nds.map(n => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, period: bestPeriod } };
        }
        return n;
      })
    );
    
    toast({
        title: "Optimizasyon Tamamlandı!",
        description: `En iyi periyot ${bestPeriod} olarak bulundu (Simülasyon Kâr Faktörü: ${bestProfitFactor.toFixed(2)}).`
    })
  };


  const nodeTypes = useMemo(() => ({
    indicator: (props: NodeProps) => <IndicatorNode {...props} data={{ ...props.data, onOptimize: handleOptimizePeriod }} />,
    logic: LogicNode,
    action: ActionNode,
    dataSource: DataSourceNode,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); 


  const addNode = useCallback((type: string, logicType?: string) => {
    const newNodeId = `${type}-${Date.now()}`;
    let nodeData = {};
    
    const position = {
        x: 250 + Math.random() * 150,
        y: 100 + Math.random() * 150,
    };

    if (type === 'dataSource') {
        nodeData = { label: 'Veri Kaynağı', exchange: 'binance', symbol: 'BTC/USDT' };
    } else if (type === 'indicator') {
      nodeData = { indicatorType: 'rsi', period: 14 };
    } else if (type === 'logic') {
      nodeData = { logicType: logicType || 'compare', operator: 'lt', value: 30 };
    } else if (type === 'action') {
      nodeData = { actionType: 'buy' };
    }

    const newNode: Node = {
      id: newNodeId,
      type,
      position,
      data: nodeData,
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);


  const handleRunStrategy = async () => {
    setIsCompiling(true);
    toast({
        title: 'Strateji Test Ediliyor...',
        description: 'Lütfen bekleyin.',
    });

    try {
      const response = await fetch('/api/run-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Bilinmeyen bir test hatası oluştu.');
      }
      
      toast({
        title: 'Test Başarılı',
        description: data.message,
        variant: 'default',
      });

    } catch (error) {
       const errorMessage = (error as Error).message;
       toast({
         title: 'Test Hatası',
         description: errorMessage,
         variant: 'destructive',
       });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSaveStrategy = () => {
    try {
        const storedBotsJSON = localStorage.getItem('myBots');
        let bots: Bot[] = storedBotsJSON ? JSON.parse(storedBotsJSON) : [];
        const dataSourceNode = nodes.find(n => n.type === 'dataSource');
        const indicatorNode = nodes.find(n => n.type === 'indicator');
        const symbol = dataSourceNode?.data.symbol || 'UNKN';
        const indicator = indicatorNode?.data.indicatorType.toUpperCase() || 'Strateji';

        if (editingBotId) {
            bots = bots.map(bot => {
                if (bot.id === editingBotId) {
                    return {
                        ...bot,
                        pair: symbol,
                        config: strategyConfig,
                        nodes: nodes,
                        edges: edges,
                    };
                }
                return bot;
            });
            const botName = bots.find(b => b.id === editingBotId)?.name;
            toast({
                title: 'Strateji Güncellendi!',
                description: `"${botName}" adlı botun yapısı ve ayarları güncellendi.`,
            });
        } else {
            let baseName = `${symbol.split('/')[0]}-${indicator} Stratejisi`;
            let botName = baseName;
            let counter = 2;
            while (bots.some(b => b.name === botName)) {
                botName = `${baseName} #${counter}`;
                counter++;
            }

            const newBot: Bot = {
                id: Date.now(),
                name: botName,
                pair: symbol,
                status: 'Durduruldu',
                pnl: 0,
                duration: "0s",
                config: strategyConfig,
                nodes: nodes,
                edges: edges,
                webhookSecret: crypto.randomUUID(),
            };
            bots.push(newBot);
            toast({
                title: 'Strateji Kaydedildi!',
                description: `"${botName}" adlı yeni bot oluşturuldu.`,
            });
        }
        
        localStorage.setItem('myBots', JSON.stringify(bots));
        router.push('/bot-status');

    } catch (error) {
        toast({
            title: 'Kayıt Hatası',
            description: 'Bot kaydedilirken bir hata oluştu.',
            variant: 'destructive',
        });
        console.error("Bot kaydetme hatası:", error);
    }
  };
  
    const handleRunBacktest = async (values: BacktestFormValues) => {
        setBacktestProgress({ loaded: 0, total: 0, message: "Başlatılıyor..." });
        setActiveBacktestRun(null);
        toast({ title: "Backtest Başlatıldı", description: "Geçmiş veriler çekiliyor ve strateji simüle ediliyor..." });

        const allCandles: any[] = [];
        let currentSince = values.dateRange.from.getTime();
        const endDate = values.dateRange.to.getTime();
        
        const timeframeMap: Record<string, number> = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
        const interval = timeframeMap[values.timeframe];
        const totalCandles = Math.ceil((endDate - currentSince) / interval);
        setBacktestProgress({ loaded: 0, total: totalCandles, message: "Veri çekiliyor..." });


        try {
            while (currentSince < endDate) {
                const cacheKey = `backtest-data-${values.symbol}-${values.timeframe}-${currentSince}`;
                let chunkData;
                
                try {
                    const cachedChunk = localStorage.getItem(cacheKey);
                    if (cachedChunk) {
                        chunkData = JSON.parse(cachedChunk);
                    }
                } catch (e) { console.error("Cache read error:", e); }


                if (!chunkData) {
                    const params = new URLSearchParams({
                        symbol: values.symbol,
                        timeframe: values.timeframe,
                        since: new Date(currentSince).toISOString(),
                    });
                    const response = await fetch(`/api/backtest-data?${params.toString()}`);
                    const data = await response.json();
                    
                    if (!response.ok || !data.ohlcv) {
                        throw new Error(data.error || 'Geçmiş veri paketi çekilemedi.');
                    }
                    chunkData = data;
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(chunkData));
                    } catch (e) { console.error("Cache write error:", e); }
                }

                if (chunkData.ohlcv.length === 0) {
                    break; 
                }

                allCandles.push(...chunkData.ohlcv);
                
                const loadedCount = allCandles.length;
                setBacktestProgress(prev => ({ ...prev!, loaded: loadedCount, message: `Veri çekiliyor... ${loadedCount} / ${totalCandles} mum yüklendi.`}));


                currentSince = chunkData.nextSince;
                if (!currentSince) {
                    break;
                }
            }
            
            if (allCandles.length === 0) {
                 throw new Error('Belirtilen aralıkta hiç veri bulunamadı.');
            }

            setBacktestProgress(prev => ({ ...prev!, message: `Strateji ${allCandles.length} mum üzerinde test ediliyor...` }));
            
            await new Promise(resolve => setTimeout(resolve, 50));

            const result = runBacktestEngine(allCandles, nodes, edges, values.initialBalance, values.commission, values.slippage);
            if ('error' in result) {
                throw new Error(result.error);
            }

            const newRun: BacktestRun = {
                id: Date.now(),
                params: values,
                result: result,
                nodes,
                edges
            };

            setBacktestHistory(prev => [newRun, ...prev].slice(0, 50));
            setActiveBacktestRun(newRun);

        } catch (error) {
            console.error("Backtest sırasında hata:", error);
            const errorMessage = (error as Error).message;
            toast({
                title: 'Backtest Hatası',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
             setBacktestProgress(null);
        }
    }


  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    setStrategyConfig(prev => ({...prev, [field]: value}));
  }
  
  const openBacktestModal = () => {
    setActiveBacktestRun(null);
    setBacktestProgress(null);
    setReportModalOpen(true);
  }

  const closeReportModal = () => {
    setReportModalOpen(false);
    setActiveBacktestRun(null);
    setBacktestProgress(null);
    setBrushTimeframe(null);
    router.replace('/editor', { scroll: false });
  }

  const handleSelectHistoryRun = (run: BacktestRun) => {
    setActiveBacktestRun(run);
    setBrushTimeframe(null);
  }

  const chartAndTradeData = useMemo(() => {
    if (!activeBacktestResult) return [];
    
    const tradesMap = new Map();
    activeBacktestResult.tradeData.forEach(trade => {
        tradesMap.set(trade.timestamp, trade);
    });

    return activeBacktestResult.ohlcData.map(ohlc => {
        const trade = tradesMap.get(ohlc.timestamp);
        return {
            ...ohlc,
            tradeMarker: trade || null,
        };
    });
  }, [activeBacktestResult]);
  
  const indicatorKeys = useMemo(() => {
    if (!activeBacktestResult?.ohlcData[0]) return [];
    return Object.keys(activeBacktestResult.ohlcData[0]).filter(k => k.includes('('));
  }, [activeBacktestResult]);

  const hasMACD = indicatorKeys.some(k => k.startsWith('MACD'));
  const hasOscillator = indicatorKeys.some(k => k.startsWith('RSI') || k.startsWith('SMA') || k.startsWith('EMA'));


  return (
    <div className="flex flex-1 flex-row overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-foreground mb-4 font-headline">Araç Kutusu</h3>
             <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('dataSource')}>
                <Database className="text-yellow-500" /> Veri Kaynağı
            </Button>
             <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('indicator')}>
                <Rss className="text-blue-500" /> İndikatör
            </Button>
            <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('logic', 'compare')}>
                <GitBranch className="text-purple-500" /> Koşul
            </Button>
            <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('logic', 'AND')}>
                <GitBranch className="text-purple-500" /> VE (AND)
            </Button>
            <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('action')}>
                <CircleDollarSign className="text-green-500" /> İşlem
            </Button>
        </aside>

        <main className="flex-1 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
                proOptions={proOptions}
            >
                <Background color="#334155" gap={20} size={1} />
                <Controls />
            </ReactFlow>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button onClick={handleRunStrategy} disabled={isCompiling || !!backtestProgress}>
                    {isCompiling ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Çalıştırılıyor...</>
                    ) : (
                        "Stratejiyi Test Et"
                    )}
                </Button>
                 <Button onClick={openBacktestModal} disabled={isCompiling || !!backtestProgress} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Play className="mr-2 h-4 w-4" /> Backtest
                </Button>
                <Button variant="secondary" className="bg-slate-600 hover:bg-slate-500" onClick={() => setIsSettingsModalOpen(true)} disabled={isCompiling || !!backtestProgress}>
                    <Settings className="mr-2 h-4 w-4" />
                    Strateji Ayarları
                </Button>
                <Button variant="secondary" onClick={handleSaveStrategy} disabled={isCompiling || !!backtestProgress}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingBotId ? 'Değişiklikleri Kaydet' : 'Yeni Olarak Kaydet'}
                </Button>
            </div>
        </main>
        
        {isReportModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-[95vw] h-[95vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900/95 text-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0">
                        <h2 className="text-xl font-headline font-semibold">Strateji Performans Raporu</h2>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={closeReportModal}>
                                <XIcon className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                     <div className="flex flex-1 min-h-0">
                         <aside className="w-72 border-r border-slate-800 flex flex-col">
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="font-semibold flex items-center gap-2"><History className="h-5 w-5"/>Geçmiş Testler</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {backtestHistory.length === 0 && <p className="p-4 text-sm text-slate-500">Henüz backtest yapılmadı.</p>}
                                <ul>
                                    {backtestHistory.map(run => (
                                        <li key={run.id}>
                                            <button 
                                                onClick={() => handleSelectHistoryRun(run)}
                                                className={cn(
                                                    "w-full text-left p-3 text-sm hover:bg-slate-800/50 transition-colors border-l-2 border-transparent",
                                                    activeBacktestRun?.id === run.id && "bg-slate-800 border-primary"
                                                )}>
                                                <div className="flex justify-between font-semibold">
                                                    <span>{run.params.symbol}</span>
                                                    <span className={run.result.stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {run.result.stats.netProfit >= 0 ? '+' : ''}{(run.result.stats.netProfit || 0).toFixed(2)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400">{run.params.timeframe} | {format(new Date(run.params.dateRange.from), 'dd.MM.yy')} - {format(new Date(run.params.dateRange.to), 'dd.MM.yy')}</p>
                                                <p className="text-xs text-slate-500 mt-1">{format(new Date(run.id), 'dd MMMM yyyy, HH:mm')}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </aside>
                        {!activeBacktestResult && !backtestProgress ? (
                           <div className="p-6 w-full max-w-md mx-auto">
                                <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><Settings className="h-5 w-5" />Backtest Ayarları</h3>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleRunBacktest)} className="space-y-6">
                                        <FormField control={form.control} name="symbol" render={({ field }) => (<FormItem><FormLabel>İşlem Çifti</FormLabel><FormControl><Input {...field} className="bg-slate-800 border-slate-700" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="timeframe" render={({ field }) => (<FormItem><FormLabel>Zaman Dilimi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="1m">1 Dakika</SelectItem><SelectItem value="5m">5 Dakika</SelectItem><SelectItem value="15m">15 Dakika</SelectItem><SelectItem value="1h">1 Saat</SelectItem><SelectItem value="4h">4 Saat</SelectItem><SelectItem value="1d">1 Gün</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="dateRange" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tarih Aralığı</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-slate-800 border-slate-700 hover:bg-slate-700", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Tarih seçin</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="initialBalance" render={({ field }) => (<FormItem><FormLabel>Bakiye (USDT)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} className="bg-slate-800 border-slate-700" /></FormControl><FormMessage /></FormItem>)}/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="commission" render={({ field }) => (<FormItem><FormLabel>Komisyon (%)</FormLabel><FormControl><Input type="number" step="0.001" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="bg-slate-800 border-slate-700" /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name="slippage" render={({ field }) => (<FormItem><FormLabel>Kayma (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="bg-slate-800 border-slate-700" /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={!!backtestProgress}>Backtest'i Başlat</Button>
                                    </form>
                                </Form>
                           </div>
                        ) : (
                        <main className="flex-1 min-h-0">
                            {backtestProgress ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                                <h3 className="text-xl font-semibold">{backtestProgress.message}</h3>
                                {backtestProgress.total > 0 && <p className="text-slate-500 mt-2">{backtestProgress.loaded} / {backtestProgress.total} mum</p>}
                                </div>
                            ) : activeBacktestResult ? (
                            <div className="p-4 md:p-6 flex-1 min-h-0 grid grid-rows-[auto,1fr] gap-6 h-full">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                    <div className="rounded-lg bg-slate-800/50 p-3">
                                        <p className="text-xs text-slate-400">Net Kâr</p>
                                        <p className={`text-lg font-bold ${(activeBacktestResult.stats.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(activeBacktestResult.stats.netProfit || 0).toFixed(2)}%</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Toplam İşlem</p><p className="text-lg font-bold">{activeBacktestResult.stats.totalTrades}</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Başarı Oranı</p><p className="text-lg font-bold">{(activeBacktestResult.stats.winRate || 0).toFixed(1)}%</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Toplam Komisyon</p><p className="text-lg font-bold">${(activeBacktestResult.stats.totalCommissions || 0).toFixed(2)}</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3">
                                        <p className="text-xs text-slate-400">Kâr Faktörü</p>
                                        <p className="text-lg font-bold">
                                            {activeBacktestResult.stats.profitFactor && isFinite(activeBacktestResult.stats.profitFactor)
                                                ? (activeBacktestResult.stats.profitFactor).toFixed(2)
                                                : "∞"}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-full">
                                    <ResponsiveContainer width="100%" height="80%">
                                        <ComposedChart data={chartAndTradeData} syncId="backtestChart" onMouseDown={(e) => {}} onMouseMove={(e) => {}} onMouseUp={() => {}}>
                                            <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3"/>
                                            <XAxis dataKey="time" tick={{fontSize: 12}} stroke="rgba(255,255,255,0.4)" allowDataOverflow domain={['dataMin', 'dataMax']} />
                                            <YAxis yAxisId="price" orientation="right" tickFormatter={(val: number) => formatPrice(val)} tick={{fontSize: 12}} stroke="hsl(var(--accent))" allowDataOverflow domain={['dataMin', 'dataMax']} />
                                            <YAxis yAxisId="pnl" orientation="left" tickFormatter={(val: number) => `$${(val / 1000).toLocaleString()}k`} tick={{fontSize: 12}} stroke="hsl(var(--primary))" allowDataOverflow domain={['dataMin', 'dataMax']} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Line yAxisId="price" type="monotone" dataKey="price" name="Fiyat" stroke="hsl(var(--accent))" strokeWidth={1} dot={<TradeArrowDot />} activeDot={false} />
                                            <Area yAxisId="pnl" type="monotone" dataKey="pnl" name="Net Bakiye" stroke="hsl(var(--primary))" fill="url(#colorPnl)" fillOpacity={0.3} />
                                            
                                            {indicatorKeys.filter(k => !k.startsWith('MACD')).map((key, i) => (
                                                <Line key={key} yAxisId="price" type="monotone" dataKey={key} name={key} stroke={`hsl(var(--chart-${(i+2)%5+1}))`} strokeWidth={1} dot={false} />
                                            ))}
                                            
                                        </ComposedChart>
                                    </ResponsiveContainer>

                                    <ResponsiveContainer width="100%" height="20%">
                                        <AreaChart data={chartAndTradeData} syncId="backtestChart" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                             <defs><linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/></linearGradient></defs>
                                            <YAxis yAxisId="pnl" orientation="left" domain={['dataMin', 'dataMax']} tickFormatter={(val: number) => `$${(val / 1000).toLocaleString()}k`} tick={{fontSize: 12}} stroke="rgba(255,255,255,0.4)" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Brush dataKey="time" height={20} stroke="hsl(var(--primary))" travellerWidth={10} onChange={setBrushTimeframe}/>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            ) : (
                               <div className="flex flex-col items-center justify-center h-full bg-slate-900 rounded-lg border border-dashed border-slate-700">
                                    <Zap className="h-16 w-16 text-slate-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-400">Backtest'e Hazır</h3>
                                    <p className="text-slate-500 mt-2 text-center">Stratejinizin geçmiş performansını görmek için soldaki formu doldurun.</p>
                                </div>
                            )}
                        </main>
                        )}
                     </div>
                </div>
            </div>
        )}

        {isSettingsModalOpen && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/95 text-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 p-4">
                        <h2 className="text-xl font-headline font-semibold">Strateji Konfigürasyonu</h2>
                        <Button variant="ghost" size="icon" onClick={() => setIsSettingsModalOpen(false)}>
                            <XIcon className="h-5 w-5"/>
                        </Button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold font-headline mb-4">İşlem Modu</h3>
                             <Select value={strategyConfig.mode} onValueChange={(value: 'LIVE' | 'PAPER') => handleConfigChange('mode', value)}>
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    <SelectItem value="PAPER">Paper (Sanal Bakiye)</SelectItem>
                                    <SelectItem value="LIVE">Live (Gerçek Bakiye - API Gerekli)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground mt-2">
                                {strategyConfig.mode === 'PAPER' 
                                    ? 'Strateji, 10,000 USDT sanal bakiye ile test edilecektir.' 
                                    : 'Strateji, ayarlardaki borsa API anahtarlarınızı kullanarak gerçek emirler gönderecektir.'}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold font-headline mb-4">Risk Yönetimi</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                                    <Input id="stop-loss" type="number" value={strategyConfig.stopLoss} onChange={e => handleConfigChange('stopLoss', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                                    <Input id="take-profit" type="number" value={strategyConfig.takeProfit} onChange={e => handleConfigChange('take-profit', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700"/>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox id="trailing-stop" checked={strategyConfig.trailingStop} onCheckedChange={checked => handleConfigChange('trailingStop', !!checked)} />
                                <Label htmlFor="trailing-stop">Trailing Stop Kullan</Label>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold font-headline mb-4">Pozisyon Boyutlandırma</h3>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="amount-type">İşlem Tutarı Tipi</Label>
                                    <Select value={strategyConfig.amountType} onValueChange={value => handleConfigChange('amountType', value)}>
                                        <SelectTrigger id="amount-type" className="bg-slate-800 border-slate-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                            <SelectItem value="fixed">Sabit ($)</SelectItem>
                                            <SelectItem value="percentage">Yüzde (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Miktar</Label>
                                    <Input id="amount" type="number" value={strategyConfig.amount} onChange={e => handleConfigChange('amount', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700"/>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4">
                                <div className="flex justify-between">
                                   <Label htmlFor="leverage">Kaldıraç (Leverage)</Label>
                                   <span className="text-sm font-mono px-2 py-1 rounded bg-slate-700">{strategyConfig.leverage}x</span>
                                </div>
                                <Slider 
                                    id="leverage" 
                                    min={1} 
                                    max={20} 
                                    step={1} 
                                    value={[strategyConfig.leverage]} 
                                    onValueChange={([value]) => handleConfigChange('leverage', value)}
                                />
                            </div>
                        </div>

                    </div>
                     <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
                        <Button onClick={() => setIsSettingsModalOpen(false)} variant="secondary">İptal</Button>
                        <Button onClick={() => {
                            toast({title: "Ayarlar Kaydedildi!"});
                            setIsSettingsModalOpen(false)
                        }}>Ayarları Kaydet</Button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    }>
      <StrategyEditorPage />
    </Suspense>
  );
}
