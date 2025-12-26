
import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { z } from 'zod';

const fetchRequestSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  since: z.string().datetime(), // Start date for the chunk
  limit: z.number().int().positive().optional().default(1000), // How many candles to fetch
});

// Helper to convert timeframe string (e.g., '1h', '4h') to milliseconds
const timeframeToMs = (timeframe: string): number => {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));
    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: throw new Error(`Unsupported timeframe unit: ${unit}`);
    }
};


/**
 * Fills missing candles in a dataset using Forward Fill strategy.
 * @param ohlcv The raw OHLCV data, sorted by timestamp ascending.
 * @param timeframe The timeframe string (e.g., '1h').
 * @returns A new array of OHLCV data with gaps filled.
 */
function fillMissingCandles(ohlcv: ccxt.OHLCV[], timeframe: string): ccxt.OHLCV[] {
    if (ohlcv.length < 2) {
        return ohlcv;
    }

    const interval = timeframeToMs(timeframe);
    const filled: ccxt.OHLCV[] = [ohlcv[0]];
    let missingCount = 0;

    for (let i = 1; i < ohlcv.length; i++) {
        const prevTimestamp = ohlcv[i-1][0];
        const currentTimestamp = ohlcv[i][0];
        const diff = currentTimestamp - prevTimestamp;

        if (diff > interval) {
            const gaps = Math.round(diff / interval) - 1;
            const prevClose = ohlcv[i-1][4]; // Previous close price

            for (let j = 1; j <= gaps; j++) {
                const missingTimestamp = prevTimestamp + j * interval;
                // Create a new candle using the previous close for all prices and 0 volume
                const newCandle: ccxt.OHLCV = [
                    missingTimestamp,
                    prevClose, // open
                    prevClose, // high
                    prevClose, // low
                    prevClose, // close
                    0          // volume
                ];
                filled.push(newCandle);
                missingCount++;
            }
        }
        filled.push(ohlcv[i]);
    }
    
    if(missingCount > 0) {
        console.log(`[Backtest-Data] Data integrity check complete. Filled ${missingCount} missing candles.`);
    }

    return filled;
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    const parseResult = fetchRequestSchema.safeParse({
        symbol: searchParams.get('symbol'),
        timeframe: searchParams.get('timeframe'),
        since: searchParams.get('since'),
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : undefined,
    });

    if (!parseResult.success) {
        return NextResponse.json({ error: 'Invalid query parameters', details: parseResult.error.flatten() }, { status: 400 });
    }

    const { symbol, timeframe, since, limit } = parseResult.data;

    try {
        const exchange = new ccxt.binance({
            options: {
                defaultType: 'future',
            },
        });

        const sinceTimestamp = new Date(since).getTime();

        console.log(`[Backtest-Data API] Fetching chunk for ${symbol} from ${new Date(sinceTimestamp).toISOString()}`);
        
        const rawOhlcv = await exchange.fetchOHLCV(symbol, timeframe, sinceTimestamp, limit);
        
        if (rawOhlcv.length === 0) {
             return NextResponse.json({ ohlcv: [], nextSince: null });
        }
        
        // Data integrity check is not strictly needed here as we fetch in sequence, 
        // but it's good practice for API robustness if the exchange skips candles.
        const filledOhlcv = fillMissingCandles(rawOhlcv, timeframe);

        const lastTimestamp = filledOhlcv[filledOhlcv.length - 1][0];
        const nextSince = lastTimestamp + timeframeToMs(timeframe); // Start the next chunk after the last candle

        console.log(`[Backtest-Data API] Successfully returned ${filledOhlcv.length} candles. Next chunk starts at ${new Date(nextSince).toISOString()}`);

        return NextResponse.json({ ohlcv: filledOhlcv, nextSince });

    } catch (error: any) {
        console.error('[Backtest-Data API] Error fetching historical data chunk:', error);
        return NextResponse.json({ error: `Failed to fetch data chunk from exchange: ${error.message}` }, { status: 500 });
    }
}
