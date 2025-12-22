import { NextResponse } from 'next/server';
import axios from 'axios';
import 'dotenv/config';

// Define types for the expected API response and our standardized format
type CmcQuote = {
    name: string;
    symbol: string;
    quote: {
        USD: {
            price: number;
            percent_change_24h: number;
        };
    };
};

type FormattedTicker = {
    symbol: string;
    name: string;
    price: number;
    change: number;
};

// In-memory cache for tickers
let cachedData: { tickers: FormattedTicker[], timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 60 seconds

// Hardcoded list of popular cryptocurrency symbols for the API call
const POPULAR_SYMBOLS = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOGE", "DOT", "MATIC", 
    "LINK", "SHIB", "LTC", "BCH", "TRX", "ATOM", "NEAR", "UNI", "FTM", "ICP",
    "ARB", "OP", "INJ", "RNDR", "TIA", "SUI", "APT", "HBAR", "VET", "FIL"
];

/**
 * Fetches the latest cryptocurrency data from CoinMarketCap API.
 * Uses an in-memory cache to avoid hitting API rate limits.
 */
export async function GET() {
    const now = Date.now();
    
    // 1. Serve from cache if data is fresh
    if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
        console.log('[Market-Data] Veri önbellekten sunuluyor.');
        return NextResponse.json({
            tickers: cachedData.tickers,
            source: 'live (cached)',
        });
    }

    // 2. Check for API Key
    const apiKey = process.env.CMC_PRO_API_KEY;
    if (!apiKey) {
        console.error('[Market-Data] CoinMarketCap API anahtarı (CMC_PRO_API_KEY) bulunamadı.');
        return NextResponse.json(
            { success: false, message: 'Sunucu, piyasa verilerini alacak şekilde yapılandırılmamış.' },
            { status: 500 }
        );
    }
    
    // 3. Fetch from CoinMarketCap API
    try {
        console.log('[Market-Data] Canlı veri CoinMarketCap API\'sinden alınıyor...');
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
            headers: {
                'X-CMC_PRO_API_KEY': apiKey,
                'Accept': 'application/json',
            },
            params: {
                symbol: POPULAR_SYMBOLS.join(','),
                convert: 'USD',
            },
        });

        const quotes: Record<string, CmcQuote> = response.data.data;
        
        // 4. Format the data to our standardized structure
        const formattedTickers: FormattedTicker[] = Object.values(quotes).map(quote => ({
            symbol: quote.symbol,
            name: quote.name,
            price: quote.quote.USD.price,
            change: quote.quote.USD.percent_change_24h,
        }));
        
        console.log(`[Market-Data] CMC'den ${formattedTickers.length} adet coin verisi başarıyla alındı.`);
        
        // 5. Update cache
        cachedData = {
            tickers: formattedTickers,
            timestamp: now,
        };

        return NextResponse.json({
            tickers: formattedTickers,
            source: 'live',
        });

    } catch (error: any) {
        console.error('[Market-Data] CoinMarketCap API\'sinden veri alınırken hata oluştu:', error.response?.data || error.message);
        
        // Return an error response
        return NextResponse.json(
            { 
                success: false, 
                message: 'Piyasa verileri alınamadı. Lütfen daha sonra tekrar deneyin.',
                error: error.response?.data?.status?.error_message || error.message,
            },
            { status: 500 }
        );
    }
}
