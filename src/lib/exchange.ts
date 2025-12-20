import ccxt from 'ccxt';

// This is a server-side module. Do not import it in client components.

export async function getSupportedExchanges() {
    return ccxt.exchanges;
}

export async function getTicker(exchangeId: string, symbol: string) {
    if (!ccxt.exchanges.includes(exchangeId)) {
        throw new Error(`Exchange '${exchangeId}' is not supported.`);
    }

    try {
        const exchangeClass = (ccxt as any)[exchangeId];
        const exchange = new exchangeClass();
        const ticker = await exchange.fetchTicker(symbol);
        return ticker;
    } catch (error) {
        console.error(`Error fetching ticker for ${symbol} from ${exchangeId}:`, error);
        throw new Error(`Could not fetch ticker data. See server logs for details.`);
    }
}
