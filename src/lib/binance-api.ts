
import ccxt, { Exchange } from 'ccxt';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';
export type NetworkType = 'mainnet' | 'futures-testnet';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean; // Backwards compatibility
  networkType?: NetworkType;
}

export interface MarketOrder {
  symbol: string;
  side: OrderSide;
  quantity?: number;
  quoteOrderQty?: number;
}

export interface LimitOrder extends MarketOrder {
  price: number;
  timeInForce?: TimeInForce;
}

export interface BinanceOrderResponse extends ccxt.Order {}
export interface AccountBalance extends ccxt.Balance {}
export interface AccountInfo extends ccxt.Account {}


/**
 * Binance API Client powered by CCXT
 * This class is designed to interact with Binance's Mainnet and Futures Testnet
 * by leveraging ccxt's built-in sandbox and market type options.
 */
export class BinanceAPI {
  private exchange: Exchange;
  private networkType: NetworkType;

  constructor(credentials: BinanceCredentials) {
    this.networkType = credentials.networkType || 'mainnet';

    const isFutures = this.networkType === 'futures-testnet';
    console.log(`[BinanceAPI] Initializing for network: ${this.networkType}`);

    const exchangeOptions: any = {
      apiKey: credentials.apiKey,
      secret: credentials.apiSecret,
      options: {
        defaultType: isFutures ? 'future' : 'spot',
      },
    };
    
    this.exchange = new (ccxt as any).binance(exchangeOptions);

    if (isFutures) {
      console.log('[BinanceAPI] Setting direct URL for Futures Testnet to demo-fapi.binance.com.');
      // CCXT expects an object for urls.api, not a string.
      this.exchange.urls['api'] = {
        'public': 'https://demo-fapi.binance.com/fapi/v1',
        'private': 'https://demo-fapi.binance.com/fapi/v1',
        'fapiPublic': 'https://demo-fapi.binance.com/fapi/v1',
        'fapiPrivate': 'https://demo-fapi.binance.com/fapi/v1',
      };
    }
    
    console.log(`[BinanceAPI] CCXT Initialized. Final API URL: ${JSON.stringify(this.exchange.urls.api)}`);
  }

  /**
   * Test connectivity to Binance API
   */
  async ping(): Promise<boolean> {
    try {
      await this.exchange.fetchTime();
      console.log(`[BinanceAPI] Ping successful on ${this.networkType}`);
      return true;
    } catch (error: any) {
      console.error(`[BinanceAPI] Ping failed on ${this.networkType}:`, error.message);
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    return this.exchange.fetchTime();
  }

  /**
   * Test API credentials and permissions
   */
  async testCredentials(): Promise<{ valid: boolean; message: string }> {
    try {
      console.log("[BinanceAPI] Testing credentials by fetching account info...");
      const accountInfo = await this.getAccountInfo();
      console.log("[BinanceAPI] Account info fetched successfully.", accountInfo);
      if (accountInfo.canTrade) {
        return { valid: true, message: 'API credentials are valid and trading is enabled.' };
      } else {
        return { valid: false, message: 'API anahtarları geçerli fakat trading devre dışı.' };
      }
    } catch (error: any) {
       console.error("[BinanceAPI] Credentials test failed:", error.message);
       if (error instanceof ccxt.AuthenticationError) {
           return { valid: false, message: `Kimlik doğrulama hatası: ${error.message}` };
       }
      return { valid: false, message: error.message || 'Geçersiz API anahtarları' };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
        console.log(`[BinanceAPI] Fetching account info for ${this.networkType}...`);
        const isFutures = this.networkType === 'futures-testnet';
        const balanceInfo = isFutures
            ? await this.exchange.fetchBalance({type: 'future'}) 
            : await this.exchange.fetchBalance();

        const info = balanceInfo.info || {};
        
        return {
            ...balanceInfo,
            canTrade: info.canTrade,
            canWithdraw: info.canWithdraw,
            canDeposit: info.canDeposit,
        } as AccountInfo;

    } catch(error) {
        console.error(`[BinanceAPI] getAccountInfo Error on ${this.networkType}:`, error);
        if (error instanceof ccxt.AuthenticationError) {
            throw new Error(`Kimlik doğrulama hatası: ${error.message}`);
        }
        throw error;
    }
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<AccountBalance[]> {
    const balance = await this.getAccountInfo();
    return Object.entries(balance.total)
        .filter(([, total]) => total && total > 0)
        .map(([asset, total]) => ({
            asset,
            free: balance.free[asset]?.toString() || '0',
            used: balance.used[asset]?.toString() || '0',
            total: total.toString(),
        })) as unknown as AccountBalance[];
  }

  /**
   * Get balance for a specific asset
   */
  async getBalance(asset: string): Promise<AccountBalance | null> {
    const balances = await this.getAccountInfo();
    if (balances.total && balances.total[asset]) {
      return {
        asset,
        free: balances.free[asset]?.toString() || '0',
        used: balances.used[asset]?.toString() || '0',
        total: balances.total[asset].toString(),
      } as unknown as AccountBalance;
    }
    return null;
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<number> {
    const ticker = await this.exchange.fetchTicker(symbol);
    if (!ticker.last) {
      throw new Error(`Could not fetch price for ${symbol}`);
    }
    return ticker.last;
  }

  /**
   * Place a market order
   */
  async marketOrder(order: MarketOrder): Promise<BinanceOrderResponse> {
    const { symbol, side, quantity, quoteOrderQty } = order;
    
    const isSpot = this.exchange.options.defaultType === 'spot';
    const isBuy = side === 'BUY';
    
    const amount = isSpot && isBuy ? quoteOrderQty : quantity;
    const params = isSpot && isBuy ? { 'quoteOrderQty': amount } : {};

    if (!amount) {
        throw new Error(`For a market ${side} order, you must provide ${isSpot && isBuy ? 'quoteOrderQty' : 'quantity'}.`);
    }

    return this.exchange.createMarketOrder(symbol, side.toLowerCase() as 'buy' | 'sell', amount, undefined, params);
  }

  /**
   * Place a limit order
   */
  async limitOrder(order: LimitOrder): Promise<BinanceOrderResponse> {
     const { symbol, side, quantity, price } = order;
     if (!quantity) throw new Error("Limit orders require a 'quantity'");
     return this.exchange.createLimitOrder(symbol, side.toLowerCase() as 'buy' | 'sell', quantity, price);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.exchange.cancelOrder(orderId, symbol);
  }

  /**
   * Get open orders for a symbol
   */
  async getOpenOrders(symbol?: string): Promise<ccxt.Order[]> {
    return this.exchange.fetchOpenOrders(symbol);
  }
}

export async function createBinanceClient(testnet: boolean = false): Promise<BinanceAPI | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('exchangeKeys');
    if (!stored) return null;

    const keys = JSON.parse(stored);
    
    if (!keys?.apiKey || !keys?.secretKey) {
      console.warn("API keys in localStorage are missing or in an old format.");
      return null;
    }

    const networkType: NetworkType = keys.networkType || (testnet ? 'futures-testnet' : 'mainnet');

    return new BinanceAPI({
      apiKey: keys.apiKey,
      apiSecret: keys.secretKey,
      networkType,
    });
  } catch (error) {
    console.error('Error creating Binance client:', error);
    return null;
  }
}
