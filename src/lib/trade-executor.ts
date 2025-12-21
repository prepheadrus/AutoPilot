
import ccxt, { Exchange } from 'ccxt';
import type { BotConfig } from './types';

type ApiKeys = {
    apiKey: string;
    secretKey: string;
};

type TradeResult = {
    success: boolean;
    message: string;
    order?: ccxt.Order;
    error?: string;
};

/**
 * Creates an authenticated CCXT exchange instance.
 * Keys are passed directly, simulating in-memory decryption from a secure vault.
 */
function createExchange(keys: ApiKeys, defaultType: 'spot' | 'future' = 'future'): Exchange {
    const exchange = new (ccxt as any).binance({
        apiKey: keys.apiKey,
        secret: keys.secretKey,
        options: {
            defaultType,
        },
    });
    return exchange;
}

/**
 * Executes a trade on Binance based on the provided parameters.
 * Handles different trade types (spot, futures) and manages leverage/margin.
 */
export async function executeTrade(
    symbol: string,
    action: 'buy' | 'sell',
    config: BotConfig,
    keys: ApiKeys
): Promise<TradeResult> {
    
    // For now, we assume all trades are futures if leverage > 1
    const tradeType = config.leverage > 1 ? 'future' : 'spot';
    
    const exchange = createExchange(keys, tradeType);

    try {
        console.log(`[Executor] Initializing ${tradeType} trade for ${symbol}`);
        
        // For futures, set margin mode and leverage before trading.
        if (tradeType === 'future') {
            try {
                console.log(`[Executor] Setting margin mode to 'isolated' for ${symbol}`);
                await exchange.setMarginMode('isolated', symbol);
            } catch (e: any) {
                 // Ignore if margin mode is already set, but log other errors
                if (!e.message.includes('No need to change margin type')) {
                    throw new Error(`Failed to set margin mode: ${e.message}`);
                }
            }

            try {
                 console.log(`[Executor] Setting leverage to ${config.leverage}x for ${symbol}`);
                 await exchange.setLeverage(config.leverage, symbol);
            } catch (e: any) {
                // Ignore if leverage is already set
                if (!e.message.includes('No need to change leverage')) {
                    throw new Error(`Failed to set leverage: ${e.message}`);
                }
            }
        }

        const amountInUsd = config.amount;
        const price = (await exchange.fetchTicker(symbol)).last;
        if (!price) {
            throw new Error(`Could not fetch price for ${symbol}`);
        }
        const amountInCrypto = amountInUsd / price;

        console.log(`[Executor] Creating market ${action} order for ${amountInCrypto.toFixed(5)} ${symbol} at ~$${price}`);
        
        const order = await exchange.createMarketOrder(symbol, action, amountInCrypto);

        const successMessage = `[${tradeType.toUpperCase()}] Market ${action.toUpperCase()} order for ${symbol} executed successfully. Order ID: ${order.id}`;
        console.log(`[Executor] ${successMessage}`);

        return {
            success: true,
            message: successMessage,
            order,
        };

    } catch (error: any) {
        console.error(`[Executor] Failed to execute trade for ${symbol}:`, error.message);
        const errorMessage = `Trade Execution Failed: ${error.message}`;
        if (error instanceof ccxt.AuthenticationError) {
             throw new Error('Authentication failed. Check server API keys.');
        }
        // Return a structured error response
        return {
            success: false,
            message: errorMessage,
            error: error.message,
        };
    }
}
