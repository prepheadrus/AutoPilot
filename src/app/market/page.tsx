'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for the market list
const marketListData = [
  { symbol: "BTC", name: "Bitcoin", price: 68543.21, change: 2.34 },
  { symbol: "ETH", name: "Ethereum", price: 3567.89, change: -1.12 },
  { symbol: "SOL", name: "Solana", price: 165.43, change: 5.89 },
  { symbol: "BNB", name: "Binance Coin", price: 598.12, change: 0.55 },
  { symbol: "AVAX", name: "Avalanche", price: 36.78, change: 10.23 },
  { symbol: "DOT", name: "Polkadot", price: 7.50, change: -3.45 },
  { symbol: "MATIC", name: "Polygon", price: 0.72, change: 1.88 },
  { symbol: "LINK", name: "Chainlink", price: 18.25, change: 4.10 },
  { symbol: "XRP", name: "Ripple", price: 0.52, change: -0.98 },
  { symbol: "ADA", name: "Cardano", price: 0.45, change: 2.15 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.16, change: 7.77 },
];

// Memoized TradingView Widget to prevent re-renders on parent state changes
const TradingViewWidget = memo(({ symbol }: { symbol: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && typeof window !== 'undefined') {
      // Clear previous widget
      container.current.innerHTML = '';
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        if (typeof (window as any).TradingView !== 'undefined') {
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "tr",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            withdateranges: true,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: `tradingview_${symbol}`
          });
        }
      };
      container.current.appendChild(script);
    }
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-full" ref={container}>
      <div id={`tradingview_${symbol}`} className="h-full" />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';


export default function MarketTerminalPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarkets = marketListData.filter(coin =>
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-row overflow-hidden border border-slate-800 rounded-lg bg-slate-950">
        {/* Left Panel: Market List */}
        <aside className="w-1/4 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
            <div className="p-4 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Piyasa ara..."
                        className="bg-slate-800 border-slate-700 pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 p-2 border-b border-slate-800 text-xs text-muted-foreground sticky top-0 bg-slate-900/50 z-10">
                    <div className="font-semibold">Sembol</div>
                    <div className="text-right font-semibold">Fiyat</div>
                    <div className="text-right font-semibold">24s Değişim</div>
                </div>
                <ul>
                    {filteredMarkets.map((coin) => (
                        <li key={coin.symbol}>
                            <button 
                                className={cn(
                                    "w-full p-2 grid grid-cols-3 gap-2 items-center text-sm text-left hover:bg-slate-800/50 rounded-md transition-colors",
                                    selectedSymbol === coin.symbol && "bg-primary/10 text-primary"
                                )}
                                onClick={() => setSelectedSymbol(coin.symbol)}
                            >
                                <span className="font-bold">{coin.symbol}</span>
                                <span className="font-mono text-right">${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className={cn(
                                    "font-mono text-right",
                                    coin.change >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                    {coin.change.toFixed(2)}%
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>

        {/* Right Panel: Chart and Actions */}
        <main className="flex-1 flex flex-col">
            <div className="flex h-16 items-center justify-between p-4 border-b border-slate-800">
                <h1 className="text-xl font-headline font-bold text-white">{selectedSymbol}/USDT</h1>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/editor">
                        Bu Varlıkla Bot Oluştur <ArrowRight className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </div>
            <div className="flex-1 bg-background relative">
                <TradingViewWidget symbol={selectedSymbol} />
            </div>
        </main>
    </div>
  );
}
