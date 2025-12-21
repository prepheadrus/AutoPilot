import { NextResponse } from 'next/server';
import ccxt from 'ccxt';

const popularSymbols = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'AVAX/USDT', 
    'DOT/USDT', 'MATIC/USDT', 'LINK/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT'
];

const symbolToName: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'BNB': 'Binance Coin',
    'AVAX': 'Avalanche',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'LINK': 'Chainlink',
    'XRP': 'Ripple',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
};

// Basic in-memory cache
let cachedData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

export async function GET() {
    const now = Date.now();

    // Serve from cache if data is fresh
    if (cachedData && (now - lastFetchTime < CACHE_DURATION)) {
        return NextResponse.json(cachedData);
    }

    try {
        const exchange = new ccxt.binance();
        const tickers = await exchange.fetchTickers(popularSymbols);

        const formattedTickers = Object.values(tickers).map(ticker => {
            const baseCurrency = ticker.symbol.split('/')[0];
            return {
                symbol: baseCurrency,
                name: symbolToName[baseCurrency] || baseCurrency,
                price: ticker.last,
                change: ticker.percentage
            };
        });
        
        const response = { tickers: formattedTickers };
        
        // Update cache
        cachedData = response;
        lastFetchTime = now;

        return NextResponse.json(response);

    } catch (error) {
        console.error('Piyasa verileri alınırken hata oluştu:', error);
        return NextResponse.json(
            { success: false, message: 'Sunucu Hatası: Piyasa verileri alınamadı.' },
            { status: 500 }
        );
    }
}
