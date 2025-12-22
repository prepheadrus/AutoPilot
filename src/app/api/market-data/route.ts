
import { NextResponse } from 'next/server';
import ccxt from 'ccxt';

// The name map is useful but not exhaustive. We will fallback to the symbol if a name is not found.
const symbolToName: Record<string, string> = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'BNB': 'Binance Coin', 'XRP': 'Ripple', 'ADA': 'Cardano', 'AVAX': 'Avalanche', 'DOGE': 'Dogecoin', 'DOT': 'Polkadot', 'MATIC': 'Polygon', 'LINK': 'Chainlink', 'SHIB': 'Shiba Inu', 'LTC': 'Litecoin', 'BCH': 'Bitcoin Cash', 'TRX': 'Tron', 'ATOM': 'Cosmos', 'NEAR': 'Near Protocol', 'UNI': 'Uniswap', 'FTM': 'Fantom', 'ICP': 'Internet Computer', 'ARB': 'Arbitrum',
};

// Genişletilmiş Statik Yedek Veri (Failover Data)
const fallbackData = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68543.21, change: 1.25 },
    { symbol: 'ETH', name: 'Ethereum', price: 3601.45, change: -0.55 },
    { symbol: 'SOL', name: 'Solana', price: 165.80, change: 2.10 },
    { symbol: 'BNB', name: 'Binance Coin', price: 601.50, change: 0.80 },
    { symbol: 'XRP', name: 'Ripple', price: 0.52, change: -1.15 },
    { symbol: 'ADA', name: 'Cardano', price: 0.45, change: 0.30 },
    { symbol: 'AVAX', name: 'Avalanche', price: 36.70, change: 3.20 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, change: 5.40 },
    { symbol: 'DOT', name: 'Polkadot', price: 7.20, change: 1.10 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.72, change: -0.85 },
    { symbol: 'LINK', name: 'Chainlink', price: 18.50, change: 0.50 },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000025, change: 2.30 },
    { symbol: 'LTC', name: 'Litecoin', price: 85.30, change: 0.10 },
    { symbol: 'BCH', name: 'Bitcoin Cash', price: 450.00, change: 1.50 },
    { symbol: 'TRX', name: 'Tron', price: 0.12, change: -0.20 },
    { symbol: 'ATOM', name: 'Cosmos', price: 8.50, change: 1.20 },
    { symbol: 'NEAR', name: 'Near Protocol', price: 7.80, change: 4.50 },
    { symbol: 'UNI', name: 'Uniswap', price: 10.20, change: -2.10 },
    { symbol: 'FTM', name: 'Fantom', price: 0.85, change: 6.80 },
    { symbol: 'ICP', name: 'Internet Computer', price: 12.60, change: -1.50 },
    { symbol: 'ARB', name: 'Arbitrum', price: 1.15, change: 3.10 },
    { symbol: 'OP', name: 'Optimism', price: 2.50, change: 2.50 },
    { symbol: 'INJ', name: 'Injective', price: 30.50, change: -3.00 },
    { symbol: 'RNDR', name: 'Render Token', price: 10.10, change: 5.50 },
    { symbol: 'TIA', name: 'Celestia', price: 11.20, change: 1.80 },
    { symbol: 'SUI', name: 'Sui', price: 1.20, change: -0.70 },
];


// In-memory cache
let cachedMarkets: string[] = [];
let marketsLastFetchTime: number = 0;
const MARKETS_CACHE_DURATION = 3600000; // 1 hour

let cachedTickers: any = null;
let tickersLastFetchTime: number = 0;
const TICKERS_CACHE_DURATION = 5000; // 5 seconds

// Detect environment: Use proxy on server (Cloud Run), direct connection locally.
const isLocal = process.env.NODE_ENV === 'development';

async function getMarkets(exchange: ccxt.Exchange) {
    const now = Date.now();
    if (cachedMarkets.length > 0 && (now - marketsLastFetchTime < MARKETS_CACHE_DURATION)) {
        return cachedMarkets;
    }
    
    console.log("Piyasa listesi önbelleği eski, yeniden alınıyor...");
    await exchange.loadMarkets();
    const usdtMarkets = exchange.symbols.filter(s => s.endsWith('/USDT') && !s.includes(':') && !s.includes('/'));
    
    cachedMarkets = usdtMarkets;
    marketsLastFetchTime = now;
    
    return cachedMarkets;
}

export async function GET() {
    const now = Date.now();
    
    // Serve from tickers cache if data is fresh
    if (cachedTickers && (now - tickersLastFetchTime < TICKERS_CACHE_DURATION)) {
        return NextResponse.json(cachedTickers);
    }

    try {
        console.log(`[Market-Data] Ortam: ${isLocal ? 'Yerel' : 'Sunucu'}. Proxy durumu: ${!isLocal && process.env.PROXY_URL ? 'Aktif' : 'Pasif'}`);
        const exchangeConfig = {
            // Conditionally add proxy if on server and PROXY_URL is set
            ...(!isLocal && process.env.PROXY_URL ? { 'https': process.env.PROXY_URL, 'http': process.env.PROXY_URL, 'httpsProxy': process.env.PROXY_URL, 'httpProxy': process.env.PROXY_URL } : {})
        };
        const exchange = new ccxt.binance(exchangeConfig);

        const allUsdtSymbols = await getMarkets(exchange);
        
        // Fetch tickers in chunks to avoid hitting API rate limits
        const chunkSize = 100;
        const allTickers: { [key: string]: ccxt.Ticker } = {};

        for (let i = 0; i < allUsdtSymbols.length; i += chunkSize) {
            const chunk = allUsdtSymbols.slice(i, i + chunkSize);
            try {
                const tickersChunk = await exchange.fetchTickers(chunk);
                Object.assign(allTickers, tickersChunk);
            } catch (e) {
                 // If a chunk fails, log it but continue with the next one
                console.warn(`[Market-Data] Piyasa verisi alınırken bir bölüm başarısız oldu: ${chunk.join(',')}`, e);
            }
        }
        const fetchedCount = Object.keys(allTickers).length;
        console.log(`[Market-Data] API'den gelen coin sayısı: ${fetchedCount}`);
        
        // Eğer API'den hiç coin gelmezse hata fırlat
        if (fetchedCount === 0) {
            throw new Error("Borsa API'sinden hiç ticker alınamadı.");
        }


        const formattedTickers = Object.values(allTickers)
            .filter(ticker => ticker.last && ticker.percentage !== undefined && ticker.symbol)
            .map(ticker => {
                const baseCurrency = ticker.symbol.split('/')[0];
                return {
                    symbol: baseCurrency,
                    // Use the name from the map, or fallback to the base currency symbol itself.
                    // This ensures the 'name' field is never undefined.
                    name: symbolToName[baseCurrency] || baseCurrency, 
                    price: ticker.last,
                    change: ticker.percentage
                };
            })
            // Sort by symbol alphabetically
            .sort((a, b) => a.symbol.localeCompare(b.symbol));
        
        const response = { tickers: formattedTickers, source: 'live' };
        
        // Update tickers cache
        cachedTickers = response;
        tickersLastFetchTime = now;

        return NextResponse.json(response);

    } catch (error) {
        console.error('[Market-Data] Canlı piyasa verileri alınırken hata oluştu:', error);
        
        // Hata durumunda statik yedek veriyi kullan
        console.log('[Market-Data] Failover: Statik yedek veri kullanılıyor.');
        return NextResponse.json({ 
            tickers: fallbackData, 
            source: 'static' 
        });
    }
}
