import type { Node, Edge } from '@xyflow/react';

export type BotStatus = "Çalışıyor" | "Durduruldu" | "Hata";

export type BotConfig = {
    mode: 'LIVE' | 'PAPER';
    stopLoss: number;
    takeProfit: number;
    trailingStop: boolean;
    amountType: 'fixed' | 'percentage';
    amount: number;
    leverage: number;
    // Paper/Live trading state
    initialBalance?: number;
    currentBalance?: number;
    inPosition?: boolean;
    entryPrice?: number;
    positionSize?: number;
};

export type Bot = {
    id: number;
    name: string;
    pair: string;
    status: BotStatus;
    pnl: number;
    duration: string;
    config: BotConfig;
    nodes?: Node[];
    edges?: Edge[];
    webhookSecret?: string; // Unique secret for validating webhook calls
};

export type Log = {
    type: 'info' | 'trade' | 'warning' | 'error';
    message: string;
};

// Represents the inputs for a backtest run
export type BacktestParams = {
    symbol: string;
    timeframe: string;
    dateRange: {
        from: Date;
        to: Date;
    };
    initialBalance: number;
    commission: number;
    slippage: number;
};

// Represents the output/results of a backtest run
export type BacktestResult = {
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

// Represents a complete backtest record for the history
export type BacktestRun = {
    id: number;
    params: BacktestParams;
    result: BacktestResult;
    nodes: Node[];
    edges: Edge[];
};
