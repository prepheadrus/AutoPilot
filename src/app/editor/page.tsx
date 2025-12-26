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
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  Bar,
  Cell,
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
import { Loader2, Rss, GitBranch, CircleDollarSign, Save, Play, Settings, X as XIcon, ArrowUp, ArrowDown, Database, Zap, CalendarIcon, History } from 'lucide-react';
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
    position: { x: 50, y: 200 },
    data: { label: 'RSI İndikatörü', indicatorType: 'rsi', period: 14 }
  },
  {
    id: '2a',
    type: 'logic',
    position: { x: 350, y: 100 },
    data: { label: 'Alış Koşulu', operator: 'lt', value: 30 }
  },
  {
    id: '2b',
    type: 'logic',
    position: { x: 350, y: 300 },
    data: { label: 'Satış Koşulu', operator: 'gt', value: 70 }
  },
  {
    id: '3a',
    type: 'action',
    position: { x: 650, y: 100 },
    data: { label: 'Alış Emri', actionType: 'buy' }
  },
  {
    id: '3b',
    type: 'action',
    position: { x: 650, y: 300 },
    data: { label: 'Satış Emri', actionType: 'sell' }
  },
];

const initialEdges: Edge[] = [
  { id: 'ed1-1', source: 'd1', target: '1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-2a', source: '1', target: '2a', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-2b', source: '1', target: '2b', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2a-3a', source: '2a', target: '3a', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2b-3b', source: '2b', target: '3b', markerEnd: { type: MarkerType.ArrowClosed } },
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
    profitFactor: number;
    totalCommissions: number;
  };
};

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

// The core backtesting engine
const runBacktestEngine = (
    ohlcv: any[],
    nodes: Node[],
    edges: Edge[],
    initialBalance: number,
    commissionRate: number,
    slippageRate: number
): BacktestResult | { error: string } => {
    
    // 1. Find all data sources
    const dataSourceNodes = nodes.filter(n => n.type === 'dataSource');
    if (dataSourceNodes.length === 0) {
        return { error: 'Lütfen stratejinize en az bir "Veri Kaynağı" düğümü ekleyin.' };
    }

    // Format incoming OHLCV data and extract prices
    const formattedOhlc = ohlcv.map(candle => ({
      time: new Date(candle[0]).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timestamp: candle[0], // Keep original timestamp for matching
      date: new Date(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      price: candle[4], // Use close price as the main price point
    }));
    
    const prices = formattedOhlc.map(d => d.price);

    // 2. Calculate all indicators present on the graph
    const indicatorNodes = nodes.filter(n => n.type === 'indicator');
    const signals: Record<string, (number | undefined | { MACD?: number, signal?: number, histogram?: number })[]> = {};

    indicatorNodes.forEach(node => {
        const sourceEdge = edges.find(e => e.target === node.id);
        if (!sourceEdge) {
            console.warn(`İndikatör "${node.id}" bir kaynağa bağlı değil.`);
            signals[node.id] = [];
            return;
        }
        
        const { indicatorType, period, fastPeriod, slowPeriod, signalPeriod } = node.data;
        let result: any[] = [];

        if (indicatorType === 'rsi') {
            result = RSICalculator.calculate({ values: prices, period: period || 14 });
        } else if (indicatorType === 'sma' || indicatorType === 'ema') {
            result = SMACalculator.calculate({ values: prices, period: period || 20 });
        } else if (indicatorType === 'macd') {
            result = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
        }
        
        const padding = Array(prices.length - result.length).fill(undefined);
        signals[node.id] = padding.concat(result);
    });
    
    const chartDataWithIndicators = formattedOhlc.map((d, i) => {
        const enrichedData: any = { ...d };
        for (const nodeId in signals) {
            enrichedData[nodeId] = signals[nodeId][i];
        }
        return enrichedData;
    });

    // 3. Trading Simulation
    let inPosition = false;
    let entryPrice = 0;
    let portfolioValue = initialBalance;
    const pnlData = [{ time: new Date(ohlcv[0][0] - 3600*1000).toLocaleDateString('tr-TR'), pnl: portfolioValue }];
    const trades: {timestamp: number, type: 'buy' | 'sell', price: number}[] = [];
    let peakPortfolio = portfolioValue;
    let maxDrawdown = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalCommissions = 0;
    const actionNodes = nodes.filter(n => n.type === 'action');

    const checkConditionsForAction = (candleIndex: number, actionNodeId: string): boolean => {
        const connectedLogicEdges = edges.filter(e => e.target === actionNodeId);
        if (connectedLogicEdges.length === 0) return false;

        return connectedLogicEdges.every(edge => {
            const logicNode = nodes.find(n => n.id === edge.source);
            if (!logicNode || logicNode.type !== 'logic') return false;

            const connectedIndicatorEdges = edges.filter(e => e.target === logicNode.id);
            if (connectedIndicatorEdges.length === 0) return false;
            
            return connectedIndicatorEdges.every(indEdge => {
                const indicatorNode = nodes.find(n => n.id === indEdge.source);
                if (!indicatorNode) return false;

                let indicatorValue = signals[indicatorNode.id]?.[candleIndex];
                if (indicatorValue === undefined) return false;
                
                if (typeof indicatorValue === 'object' && indicatorValue.MACD !== undefined) {
                    indicatorValue = indicatorValue.MACD;
                }
                
                if (typeof indicatorValue !== 'number') return false;

                const { operator, value: thresholdValue } = logicNode.data;
                
                switch (operator) {
                    case 'gt': return indicatorValue > thresholdValue;
                    case 'lt': return indicatorValue < thresholdValue;
                    default: return false;
                }
            });
        });
    };

    for (let i = 1; i < chartDataWithIndicators.length; i++) {
        const candle = chartDataWithIndicators[i];
        const buyAction = actionNodes.find(n => n.data.actionType === 'buy');
        const sellAction = actionNodes.find(n => n.data.actionType === 'sell');
        
        let shouldBuy = false;
        if (buyAction) {
            shouldBuy = checkConditionsForAction(i, buyAction.id);
        }

        let shouldSell = false;
        if (sellAction) {
            shouldSell = checkConditionsForAction(i, sellAction.id);
        }

        if (shouldBuy && !inPosition) {
            const buyPrice = candle.price * (1 + slippageRate / 100);
            const commission = portfolioValue * (commissionRate / 100);
            portfolioValue -= commission;
            totalCommissions += commission;
            
            inPosition = true;
            entryPrice = buyPrice;
            trades.push({ timestamp: candle.timestamp, type: 'buy', price: buyPrice });
        } else if (shouldSell && inPosition) {
            const sellPrice = candle.price * (1 - slippageRate / 100);
            const profit = (sellPrice - entryPrice) / entryPrice;
            const positionValue = portfolioValue * (1 + profit);
            const commission = positionValue * (commissionRate / 100);
            totalCommissions += commission;
            
            portfolioValue = positionValue - commission;
            
            if (profit > 0) {
                totalProfit += profit * portfolioValue; // Gross profit for profit factor
                winningTrades++;
            } else {
                totalLoss += Math.abs(profit * portfolioValue); // Gross loss for profit factor
                losingTrades++;
            }

            inPosition = false;
            trades.push({ timestamp: candle.timestamp, type: 'sell', price: sellPrice });
        }

        pnlData.push({ time: candle.time, pnl: portfolioValue });

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
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
      totalCommissions: totalCommissions
    }

    const finalChartData = chartDataWithIndicators.map((d, i) => {
        const dataPoint: any = {...d};
        indicatorNodes.forEach(node => {
            let key;
            const signal = signals[node.id]?.[i];

            if (node.data.indicatorType === 'macd') {
                key = `MACD(${node.data.fastPeriod || 12},${node.data.slowPeriod || 26},${node.data.signalPeriod || 9})`;
                if(typeof signal === 'object' && signal !== null) {
                    dataPoint[`${key}_MACD`] = signal.MACD;
                    dataPoint[`${key}_Signal`] = signal.signal;
                    dataPoint[`${key}_Hist`] = signal.histogram;
                }
            } else {
                key = `${node.data.indicatorType.toUpperCase()}(${node.data.period})`;
                dataPoint[key] = signal;
            }
        });
        return dataPoint;
    });

    return { ohlcData: finalChartData, tradeData: trades, pnlData, stats };
};

const TradeArrowDot = ({ cx, cy, payload }: any) => {
    if (!payload.tradeMarker) return null;

    const isBuy = payload.tradeMarker.type === 'buy';
    const color = isBuy ? '#22c55e' : '#ef4444'; // green-500 or red-500

    // Position arrow below for buy, above for sell
    const yPosition = isBuy ? payload.price * 0.995 : payload.price * 1.005;
    const yCoord = cy - (payload.price - yPosition); // Adjust cy based on price difference

    const points = isBuy
      ? `${cx},${yCoord + 5} ${cx - 5},${yCoord - 5} ${cx + 5},${yCoord - 5}` // Up arrow below price
      : `${cx},${yCoord - 5} ${cx - 5},${yCoord + 5} ${cx + 5},${yCoord + 5}`; // Down arrow above price

    return <polygon points={points} fill={color} />;
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
// --- END: Backtest Engine ---

const proOptions = { hideAttribution: true };

function StrategyEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [strategyConfig, setStrategyConfig] = useState<BotConfig>(initialStrategyConfig);
  
  const [backtestHistory, setBacktestHistory] = useState<BacktestRun[]>([]);
  const [activeBacktestResult, setActiveBacktestResult] = useState<BacktestResult | null>(null);
  
  const [editingBotId, setEditingBotId] = useState<number | null>(null);

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
    
    // Check if we need to load a specific report from history
    const reportId = searchParams.get('reportId');
    if (reportId) {
        try {
            const storedHistory = localStorage.getItem('backtestHistory');
            const history: BacktestRun[] = storedHistory ? JSON.parse(storedHistory) : [];
            const reportToLoad = history.find(run => run.id === Number(reportId));
            if (reportToLoad) {
                setActiveBacktestResult(reportToLoad.result);
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

    // Prevent loading bot data if a report is being viewed
    if (reportId) return;

    if (editBotId) {
        try {
            const storedBotsJSON = localStorage.getItem('myBots');
            const bots: Bot[] = storedBotsJSON ? JSON.parse(storedBotsJSON) : [];
            const botToEdit = bots.find(b => b.id === Number(editBotId));

            if (botToEdit) {
                setEditingBotId(botToEdit.id);
                // Use || to provide default values if nodes/edges are not saved with the bot
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


  const addNode = useCallback((type: string) => {
    const newNodeId = `${type}-${Date.now()}`;
    let nodeLabel = "Yeni Düğüm";
    let nodeData = {};
    
    const position = {
        x: 250 + Math.random() * 150,
        y: 100 + Math.random() * 150,
    };

    if (type === 'dataSource') {
        nodeLabel = 'Veri Kaynağı';
        nodeData = { label: nodeLabel, exchange: 'binance', symbol: 'BTC/USDT' };
    } else if (type === 'indicator') {
      nodeLabel = 'Yeni İndikatör';
      nodeData = { label: nodeLabel, indicatorType: 'rsi', period: 14 };
    } else if (type === 'logic') {
      nodeLabel = 'Yeni Koşul';
      nodeData = { label: nodeLabel, operator: 'lt', value: 30 };
    } else if (type === 'action') {
      nodeLabel = 'Yeni İşlem';
      nodeData = { label: nodeLabel, actionType: 'buy' };
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
            // Update existing bot
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
            // Create new bot with smart naming
            let baseName = `${symbol.split('/')[0]}-${indicator} Stratejisi`;
            let botName = baseName;
            let counter = 2;
            // Ensure the name is unique
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
    setIsBacktesting(true);
    setActiveBacktestResult(null); // Clear previous results to show loading state
    toast({ title: "Backtest Başlatıldı", description: "Geçmiş veriler çekiliyor ve strateji simüle ediliyor..." });

    try {
        const params = new URLSearchParams({
            symbol: values.symbol,
            timeframe: values.timeframe,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to.toISOString(),
        });
        const response = await fetch(`/api/backtest-data?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.ohlcv || data.ohlcv.length === 0) {
            throw new Error(data.error || 'Geçmiş veriler çekilemedi veya boş geldi.');
        }

        console.log(`Fetched ${data.ohlcv.length} candles for backtest.`);
        
        const result = runBacktestEngine(data.ohlcv, nodes, edges, values.initialBalance, values.commission, values.slippage);
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

        setBacktestHistory(prev => [newRun, ...prev].slice(0, 50)); // Keep last 50 runs
        setActiveBacktestResult(result);

    } catch (error) {
        console.error("Backtest sırasında hata:", error);
        const errorMessage = (error as Error).message;
        toast({
            title: 'Backtest Hatası',
            description: errorMessage,
            variant: 'destructive',
        });
        // Ensure modal closes or shows an error state, not loading forever
        setIsBacktesting(false);
    } finally {
        // This will now happen only on success, letting error handle its state
        setIsBacktesting(false);
    }
  }

  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    setStrategyConfig(prev => ({...prev, [field]: value}));
  }
  
  const openBacktestModal = () => {
    setActiveBacktestResult(null);
    setReportModalOpen(true);
  }

  const closeReportModal = () => {
    setReportModalOpen(false);
    setActiveBacktestResult(null);
    // Clear the reportId from URL to prevent re-opening on refresh
    router.replace('/editor', { scroll: false });
  }

  const chartAndTradeData = useMemo(() => {
    if (!activeBacktestResult) return [];
    
    // Create a map of trades for efficient lookup
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
    if (!activeBacktestResult || chartAndTradeData.length === 0) return [];
    const firstDataPoint = chartAndTradeData[0];
    return Object.keys(firstDataPoint).filter(key => key.includes('('));
  }, [activeBacktestResult, chartAndTradeData]);
  
  const hasOscillator = useMemo(() => {
    return indicatorKeys.some(key => key.startsWith('RSI'));
  }, [indicatorKeys]);
  
  const hasMACD = useMemo(() => {
    return indicatorKeys.some(key => key.startsWith('MACD'));
  }, [indicatorKeys]);


  return (
    <div className="flex flex-1 flex-row overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-foreground mb-4 font-headline">Araç Kutusu</h3>
             <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('dataSource')}>
                <Database className="text-yellow-500" /> Veri Kaynağı Ekle
            </Button>
             <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('indicator')}>
                <Rss className="text-blue-500" /> İndikatör Ekle
            </Button>
            <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('logic')}>
                <GitBranch className="text-purple-500" /> Mantık Ekle
            </Button>
            <Button variant="outline" className="justify-start gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700" onClick={() => addNode('action')}>
                <CircleDollarSign className="text-green-500" /> İşlem Ekle
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
                <Button onClick={handleRunStrategy} disabled={isCompiling || isBacktesting}>
                    {isCompiling ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Çalıştırılıyor...</>
                    ) : (
                        "Stratejiyi Test Et"
                    )}
                </Button>
                 <Button onClick={openBacktestModal} disabled={isCompiling || isBacktesting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Play className="mr-2 h-4 w-4" /> Backtest
                </Button>
                <Button variant="secondary" className="bg-slate-600 hover:bg-slate-500" onClick={() => setIsSettingsModalOpen(true)} disabled={isCompiling || isBacktesting}>
                    <Settings className="mr-2 h-4 w-4" />
                    Strateji Ayarları
                </Button>
                <Button variant="secondary" onClick={handleSaveStrategy} disabled={isCompiling || isBacktesting}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingBotId ? 'Değişiklikleri Kaydet' : 'Yeni Olarak Kaydet'}
                </Button>
            </div>
        </main>
        
        {isReportModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-[90vw] h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900/95 text-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0">
                        <h2 className="text-xl font-headline font-semibold">Strateji Performans Raporu</h2>
                        <Button variant="ghost" size="icon" onClick={closeReportModal}>
                            <XIcon className="h-5 w-5"/>
                        </Button>
                    </div>
                     <div className="flex flex-1 min-h-0">
                        {!activeBacktestResult && !isBacktesting ? (
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
                                        <Button type="submit" className="w-full" disabled={isBacktesting}>Backtest'i Başlat</Button>
                                    </form>
                                </Form>
                           </div>
                        ) : (
                        <main className="flex-1 min-h-0">
                            {isBacktesting ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                                <h3 className="text-xl font-semibold">Backtest Çalıştırılıyor...</h3>
                                <p className="text-slate-500 mt-2">Geçmiş veriler çekiliyor ve stratejiniz simüle ediliyor. Lütfen bekleyin.</p>
                                </div>
                            ) : activeBacktestResult ? (
                            <div className="p-4 md:p-6 flex-1 min-h-0 grid grid-rows-[auto,1fr] gap-6 h-full">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                    <div className="rounded-lg bg-slate-800/50 p-3">
                                        <p className="text-xs text-slate-400">Net Kâr</p>
                                        <p className={`text-lg font-bold ${activeBacktestResult.stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{activeBacktestResult.stats.netProfit.toFixed(2)}%</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Toplam İşlem</p><p className="text-lg font-bold">{activeBacktestResult.stats.totalTrades}</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Başarı Oranı</p><p className="text-lg font-bold">{activeBacktestResult.stats.winRate.toFixed(1)}%</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Toplam Komisyon</p><p className="text-lg font-bold">${activeBacktestResult.stats.totalCommissions.toFixed(2)}</p></div>
                                    <div className="rounded-lg bg-slate-800/50 p-3"><p className="text-xs text-slate-400">Kâr Faktörü</p><p className="text-lg font-bold">{isFinite(activeBacktestResult.stats.profitFactor) ? activeBacktestResult.stats.profitFactor.toFixed(2) : "∞"}</p></div>
                                </div>
                                <div className="w-full h-full">
                                <ResponsiveContainer width="100%" height={(hasOscillator || hasMACD) ? "70%" : "100%"}>
                                    <ComposedChart data={chartAndTradeData} syncId="backtestChart">
                                        <defs><linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/></linearGradient></defs>
                                        <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3"/><XAxis dataKey="time" tick={{fontSize: 12}} stroke="rgba(255,255,255,0.4)" />
                                        <YAxis yAxisId="pnl" orientation="left" domain={['auto', 'auto']} tickFormatter={(val: number) => `$${val.toLocaleString()}`} tick={{fontSize: 12}} stroke="hsl(var(--primary))" />
                                        <YAxis yAxisId="price" orientation="right" domain={['dataMin * 0.98', 'dataMax * 1.02']} tickFormatter={(val: number) => formatPrice(val)} tick={{fontSize: 12}} stroke="hsl(var(--accent))" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area yAxisId="pnl" type="monotone" dataKey="pnl" name="Net Bakiye (Maliyetler Sonrası)" stroke="hsl(var(--primary))" fill="url(#colorPnl)" />
                                        <Line yAxisId="price" type="monotone" dataKey="price" name="Fiyat" stroke="hsl(var(--accent))" strokeWidth={2} dot={<TradeArrowDot />} activeDot={false} />
                                        {indicatorKeys.filter(k => !k.startsWith('RSI') && !k.startsWith('MACD')).map((key, index) => (<Line key={key} yAxisId="price" type="monotone" dataKey={key} name={key} stroke={["#facc15", "#38bdf8"][(index) % 2]} dot={false} strokeWidth={1.5} />))}
                                    </ComposedChart>
                                </ResponsiveContainer>
                                {hasOscillator && !hasMACD && (<ResponsiveContainer width="100%" height="30%"><ComposedChart data={chartAndTradeData} syncId="backtestChart" margin={{left: 0, right: 10, top: 20}}><CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3"/><XAxis dataKey="time" hide={true}/><YAxis yAxisId="indicator" orientation="right" domain={[0, 100]} tickCount={4} tick={{fontSize: 12}} stroke="rgba(255,255,255,0.4)" /><Tooltip content={<CustomTooltip />} /><ReferenceLine yAxisId="indicator" y={70} label={{value: "70", position: 'insideRight', fill: 'rgba(255,255,255,0.5)', fontSize: 10}} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" /><ReferenceLine yAxisId="indicator" y={30} label={{value: "30", position: 'insideRight', fill: 'rgba(255,255,255,0.5)', fontSize: 10}} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />{indicatorKeys.filter(k => k.startsWith('RSI')).map((key, index) => (<Line key={key} yAxisId="indicator" type="monotone" dataKey={key} stroke={["#eab308", "#3b82f6"][index % 2]} fillOpacity={0.2} name={key} dot={false}/>))}</ComposedChart></ResponsiveContainer>)}
                                {hasMACD && (<ResponsiveContainer width="100%" height="30%"><ComposedChart data={chartAndTradeData} syncId="backtestChart" margin={{left: 0, right: 10, top: 20}}><CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3"/><XAxis dataKey="time" hide={true}/><YAxis yAxisId="macd" orientation="right" domain={['auto', 'auto']} tickCount={5} tick={{fontSize: 12}} stroke="rgba(255,255,255,0.4)" /><Tooltip content={<CustomTooltip />} /><ReferenceLine yAxisId="macd" y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />{indicatorKeys.filter(k => k.includes('_Hist')).map((key) => (<Bar key={key} yAxisId="macd" dataKey={key} name="Histogram" >{chartAndTradeData.map((entry, i) => (<Cell key={`cell-${i}`} fill={(entry[key] ?? 0) > 0 ? '#22c55e' : '#ef4444'} />))}</Bar>))}{indicatorKeys.filter(k => k.includes('_MACD')).map((key) => (<Line key={key} yAxisId="macd" type="monotone" dataKey={key} name="MACD" stroke="#3b82f6" dot={false}/>))}{indicatorKeys.filter(k => k.includes('_Signal')).map((key) => (<Line key={key} yAxisId="macd" type="monotone" dataKey={key} name="Signal" stroke="#f97316" dot={false}/>))}</ComposedChart></ResponsiveContainer>)}
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
                        {/* Trading Mode */}
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

                        {/* Risk Yönetimi */}
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
                                <Label htmlFor="trailing-stop">Trailing Stop Kullan</Label>                            </div>
                        </div>
                        
                        {/* Pozisyon Boyutlandırma */}
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
