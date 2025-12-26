
import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { z } from 'zod';

const fetchRequestSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
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

    console.log(`[Backtest-Data] Starting data integrity check. Initial candle count: ${ohlcv.length}`);
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
    } else {
        console.log(`[Backtest-Data] Data integrity check complete. No missing candles found.`);
    }

    return filled;
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
        
        const rawOhlcv = await fetchAllOHLCV(exchange, symbol, timeframe, since, to);
        
        if (rawOhlcv.length === 0) {
             return NextResponse.json({ ohlcv: [] });
        }
        
        const filledOhlcv = fillMissingCandles(rawOhlcv, timeframe);

        console.log(`[Backtest-Data] Successfully processed data for ${symbol}. Final candle count: ${filledOhlcv.length}.`);

        return NextResponse.json({ ohlcv: filledOhlcv });

    } catch (error: any) {
        console.error('[Backtest-Data API] Error fetching historical data:', error);
        return NextResponse.json({ error: `Failed to fetch data from exchange: ${error.message}` }, { status: 500 });
    }
}
