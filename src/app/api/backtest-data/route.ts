import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { z } from 'zod';

const fetchRequestSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Helper function to handle fetching all data for a long date range
async function fetchAllOHLCV(exchange: ccxt.Exchange, symbol: string, timeframe: string, since: number, to: number): Promise<ccxt.OHLCV[]> {
    let allCandles: ccxt.OHLCV[] = [];
    let currentSince = since;
    const limit = 1000; // Binance's max limit for fapi

    console.log(`[Backtest-Data] Starting historical data fetch for ${symbol} from ${new Date(since).toISOString()} to ${new Date(to).toISOString()}`);

    while (currentSince < to) {
        try {
            console.log(`[Backtest-Data] Fetching chunk starting from ${new Date(currentSince).toISOString()}`);
            const candles = await exchange.fetchOHLCV(symbol, timeframe, currentSince, limit);
            
            if (candles.length === 0) {
                console.log('[Backtest-Data] No more candles returned, ending fetch.');
                break;
            }

            allCandles = allCandles.concat(candles);
            const lastTimestamp = candles[candles.length - 1][0];
            
            if (lastTimestamp >= to || lastTimestamp === currentSince) {
                // Break if we've reached the end date or if the API returns the same candle (no new data)
                break;
            }

            currentSince = lastTimestamp;

        } catch (error) {
            console.error('[Backtest-Data] Error fetching OHLCV chunk:', error);
            // In case of error, we can decide to stop or retry. For now, we'll stop and return what we have.
            throw new Error('Failed to fetch a part of the historical data.');
        }
    }

    // Filter out any candles that are outside the requested range
    return allCandles.filter(candle => candle[0] >= since && candle[0] <= to);
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    const parseResult = fetchRequestSchema.safeParse({
        symbol: searchParams.get('symbol'),
        timeframe: searchParams.get('timeframe'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
    });

    if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid query parameters', details: parseResult.error.flatten() }, { status: 400 });
    }

    const { symbol, timeframe, startDate, endDate } = parseResult.data;

    try {
        // We will use Binance's public API for historical data, no keys needed.
        // We target the futures API for more data availability.
        const exchange = new ccxt.binance({
            options: {
                defaultType: 'future',
            },
        });

        const since = new Date(startDate).getTime();
        const to = new Date(endDate).getTime();

        if (since >= to) {
            return NextResponse.json({ error: 'Start date must be before end date.' }, { status: 400 });
        }
        
        const ohlcv = await fetchAllOHLCV(exchange, symbol, timeframe, since, to);

        console.log(`[Backtest-Data] Successfully fetched ${ohlcv.length} candles for ${symbol}.`);

        return NextResponse.json({ ohlcv });

    } catch (error: any) {
        console.error('[Backtest-Data API] Error fetching historical data:', error);
        return NextResponse.json({ error: `Failed to fetch data from exchange: ${error.message}` }, { status: 500 });
    }
}
