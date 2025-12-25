import ccxt from 'ccxt';
import { fetchOHLCV, fetchPrice } from './exchange';
import { calculateRSI } from './indicators';

type Strategy = {
  indicator: {
    type: string;
    period: number;
  };
  condition: {
    operator: string;
    value: number;
  };
  action: {
    type: string;
    amount: number; // This might represent a fixed amount or percentage
  };
};

type EngineResult = {
    decision: 'BUY' | 'SELL' | 'WAIT';
    message: string;
    data: any;
}

type ApiKeys = {
    apiKey: string;
    secret: string;
}

// Detect environment: Use proxy on server (Cloud Run), direct connection locally.
const isLocal = process.env.NODE_ENV === 'development';

/**
 * Runs a given strategy with live data and returns a trading decision.
 * @param strategy The compiled strategy object from the editor.
 * @param symbol The trading pair to operate on (e.g., 'BTC/USDT').
 * @param keys The API keys for the exchange.
 * @returns An object containing the decision, a descriptive message, and relevant data.
 */
export async function runStrategy(strategy: Strategy, symbol: string = 'BTC/USDT', keys: ApiKeys): Promise<EngineResult> {
    try {
        const exchangeId = 'binance'; // Hardcoded for now
        
        const exchangeConfig = {
            apiKey: keys.apiKey,
            secret: keys.secret,
            options: {
                defaultType: 'future',
            },
            // Conditionally add proxy if on server and PROXY_URL is set
            ...(!isLocal && process.env.PROXY_URL ? { 'https': process.env.PROXY_URL, 'http': process.env.PROXY_URL, 'httpsProxy': process.env.PROXY_URL, 'httpProxy': process.env.PROXY_URL } : {})
        };

        const exchange = new (ccxt as any)[exchangeId](exchangeConfig);

        // 1. Fetch Data
        const ohlcv = await fetchOHLCV(exchange, symbol, '1h');
        if (!ohlcv || ohlcv.length === 0) {
            throw new Error('Could not fetch candle data from the exchange.');
        }
        const closingPrices = ohlcv.map(candle => candle[4]);

        // 2. Calculate Indicator
        let indicatorValue: number;
        if (strategy.indicator.type.toLowerCase() === 'rsi') {
            const rsiResult = calculateRSI(closingPrices, strategy.indicator.period);
            if (rsiResult.length === 0) {
                throw new Error('Failed to calculate RSI. Not enough data points.');
            }
            indicatorValue = rsiResult[rsiResult.length - 1]; // Get the latest RSI value
        } else {
            throw new Error(`Unsupported indicator type: ${strategy.indicator.type}`);
        }

        // 3. Evaluate Condition
        const { operator, value: thresholdValue } = strategy.condition;
        let conditionMet = false;

        switch (operator) {
            case 'gt':
                conditionMet = indicatorValue > thresholdValue;
                break;
            case 'lt':
                conditionMet = indicatorValue < thresholdValue;
                break;
            default:
                throw new Error(`Invalid operator: ${operator}`);
        }

        // 4. Make Decision
        if (conditionMet) {
            const decision = strategy.action.type.toUpperCase() as 'BUY' | 'SELL';
            const currentPrice = await fetchPrice(exchange, symbol);

            // Place the actual order
            try {
                const amount = strategy.action.amount;
                const amountInCrypto = amount / currentPrice;

                console.log(`[Bot Engine] Placing ${decision} order for ${amountInCrypto.toFixed(6)} of ${symbol} (~$${amount})`);
                const order = await exchange.createMarketOrder(symbol, decision.toLowerCase(), amountInCrypto);
                console.log(`[Bot Engine] Order placed successfully. Order ID: ${order.id}`);

                return {
                    decision: decision,
                    message: `Karar: ${decision}. Koşul sağlandı (${strategy.indicator.type.toUpperCase()} ${indicatorValue.toFixed(2)} ${operator} ${thresholdValue}). Güncel Fiyat: ${currentPrice}. Emir yerleştirildi (ID: ${order.id})`,
                    data: { indicatorValue, thresholdValue, currentPrice, order }
                };
            } catch (orderError: any) {
                console.error('[Bot Engine] Order placement failed:', orderError);
                throw new Error(`Emir yerleştirilemedi: ${orderError.message}`);
            }
        } else {
            return {
                decision: 'WAIT',
                message: `Karar: BEKLE. Koşul sağlanmadı (${strategy.indicator.type.toUpperCase()} ${indicatorValue.toFixed(2)} ${operator} ${thresholdValue} değil).`,
                data: { indicatorValue, thresholdValue }
            };
        }

    } catch (error: any) {
        console.error('Error in bot engine:', error);
        // Pass CCXT errors to the frontend for better debugging
        if (error instanceof ccxt.AuthenticationError) {
             return {
                decision: 'WAIT',
                message: `Kimlik doğrulama hatası: API anahtarlarınız geçersiz veya eksik.`,
                data: { error: error.message }
            };
        }
        return {
            decision: 'WAIT',
            message: `Hata: Bot çalıştırılamadı. ${error.message}`,
            data: { error: error.message }
        };
    }
}
