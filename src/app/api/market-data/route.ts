
import { NextResponse } from 'next/server';
import axios from 'axios';

// Define types for our standardized format
type FormattedTicker = {
    symbol: string;
    name: string;
    price: number;
    change: number;
};

// --- STEP 3: Static Failover Data ---
// This is the guaranteed data that will be returned if the live API fails for any reason.
const getDebugFallbackData = (): FormattedTicker[] => {
    console.log('[Market-Data-API] DEBUG: Generating and returning static fallback data.');
    return [
      { symbol: 'BTC/USDT', name: 'Bitcoin', price: 68530.24, change: 1.75 },
      { symbol: 'ETH/USDT', name: 'Ethereum', price: 3560.88, change: -0.45 },
      { symbol: 'SOL/USDT', name: 'Solana', price: 168.15, change: 3.10 },
      { symbol: 'XRP/USDT', name: 'XRP', price: 0.52, change: -1.20 },
      { symbol: 'BNB/USDT', name: 'BNB', price: 605.60, change: 0.88 },
      { symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.16, change: 5.55 },
      { symbol: 'ADA/USDT', name: 'Cardano', price: 0.45, change: 1.15 },
      { symbol: 'AVAX/USDT', name: 'Avalanche', price: 36.70, change: 2.80 },
      { symbol: 'DOT/USDT', name: 'Polkadot', price: 7.25, change: 0.50 },
      { symbol: 'MATIC/USDT', name: 'Polygon', price: 0.72, change: -2.35 },
    ];
};

/**
 * DEBUGGING STEP: This route handler is simplified to ALWAYS return a static
 * list of tickers. This helps isolate whether the problem is in data fetching (backend)
 * or data consumption (frontend).
 */
export async function GET() {
    console.log('[Market-Data-API] GET request received. Returning debug data.');
    
    const fallbackTickers = getDebugFallbackData();
    const dataToSend = { 
        tickers: fallbackTickers, 
        source: 'static' // Explicitly mark data source
    };

    // --- STEP 1: Log the exact data structure being sent ---
    console.log("[Market-Data-API] SERVER_SENDING_DATA:", JSON.stringify(dataToSend, null, 2).substring(0, 250));

    return NextResponse.json(dataToSend);
}

