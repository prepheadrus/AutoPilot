
import crypto from 'crypto';
import ccxt, { Exchange } from 'ccxt';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';
export type NetworkType = 'mainnet' | 'spot-testnet' | 'futures-testnet';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
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
 * Supports Mainnet, Spot Testnet, and Futures Testnet by leveraging ccxt's sandbox mode.
 */
export class BinanceAPI {
  private exchange: Exchange;
  private networkType: NetworkType;

  constructor(credentials: BinanceCredentials) {
    this.networkType = credentials.networkType || 'mainnet';

    // Instantiate the exchange
    this.exchange = new (ccxt as any).binance({
      apiKey: credentials.apiKey,
      secret: credentials.apiSecret,
    });

    // Enable sandbox mode for testnets
    if (this.networkType === 'spot-testnet' || this.networkType === 'futures-testnet') {
      this.exchange.setSandboxMode(true);
    }

    // Set the default market type for futures
    if (this.networkType === 'futures-testnet') {
      this.exchange.options['defaultType'] = 'future';
    } else {
      this.exchange.options['defaultType'] = 'spot';
    }

    console.log(`[BinanceAPI] Initialized for ${this.networkType}. Sandbox: ${this.exchange.sandbox}. Default Type: ${this.exchange.options.defaultType}`);
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
      const accountInfo = await this.getAccountInfo();
      if (accountInfo.canTrade) {
        return { valid: true, message: 'API anahtarları geçerli ve trading is enabled.' };
      } else {
        return { valid: false, message: 'API anahtarları geçerli fakat trading devre dışı.' };
      }
    } catch (error: any) {
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
        const info = await this.exchange.fetchBalance();
        // Manually shape the response to match the old AccountInfo structure for compatibility
        return {
            ...info,
            balances: info.free,
            canTrade: (info.info as any).canTrade,
            canWithdraw: (info.info as any).canWithdraw,
            canDeposit: (info.info as any).canDeposit,
        };
    } catch(error) {
        console.error("[BinanceAPI] getAccountInfo Error:", error);
        throw error;
    }
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<AccountBalance[]> {
    const balance = await this.exchange.fetchBalance();
    return Object.entries(balance.total)
        .filter(([, total]) => total > 0)
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
    const balances = await this.exchange.fetchBalance();
    if (balances.total[asset]) {
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
    const amount = quantity || quoteOrderQty; // CCXT uses 'amount'
    const orderType = quantity ? 'amount' : 'cost'; // let ccxt decide based on what's provided

    return this.exchange.createMarketOrder(symbol, side.toLowerCase() as 'buy' | 'sell', amount, undefined, { [orderType]: amount });
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
