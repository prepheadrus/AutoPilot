
import ccxt, { Exchange } from 'ccxt';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';
export type NetworkType = 'mainnet' | 'futures-testnet';

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
 */
export class BinanceAPI {
  private exchange: Exchange;
  private networkType: NetworkType;

  constructor(credentials: BinanceCredentials) {
    this.networkType = credentials.networkType || 'mainnet';

    const exchangeOptions: any = {
      apiKey: credentials.apiKey,
      secret: credentials.apiSecret,
    };
    
    console.log(`[BinanceAPI] Initializing for network: ${this.networkType}`);

    this.exchange = new (ccxt as any).binance(exchangeOptions);

    if (this.networkType === 'futures-testnet') {
      console.log('[BinanceAPI] Configuring for Futures Testnet (demo-fapi.binance.com)');
      this.exchange.options['defaultType'] = 'future';
      this.exchange.urls['api'] = {
        'public': 'https://demo-fapi.binance.com/fapi',
        'private': 'https://demo-fapi.binance.com/fapi',
        'fapiPublic': 'https://demo-fapi.binance.com/fapi',
        'fapiPrivate': 'https://demo-fapi.binance.com/fapi',
      };
    } else {
        console.log('[BinanceAPI] Configuring for Mainnet (Spot)');
        this.exchange.options['defaultType'] = 'spot';
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
      throw error;
    }
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
        
        let info;
        if (this.networkType === 'futures-testnet') {
            // Use the correct method that calls /fapi/v2/account
            info = await this.exchange.fapiPrivateGetAccount();
        } else {
            // For mainnet spot
            info = await this.exchange.privateGetAccount();
        }

        return {
            ...info,
            canTrade: info.canTrade,
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
}

export async function createBinanceClient(networkType: NetworkType = 'mainnet'): Promise<BinanceAPI | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('exchangeKeys');
    if (!stored) return null;

    const keys = JSON.parse(stored);
    
    if (!keys?.apiKey || !keys?.secretKey) {
      console.warn("API keys in localStorage are missing or in the wrong format.");
      return null;
    }

    const effectiveNetworkType = keys.networkType || networkType;

    return new BinanceAPI({
      apiKey: keys.apiKey,
      apiSecret: keys.secretKey,
      networkType: effectiveNetworkType,
    });
  } catch (error) {
    console.error('Error creating Binance client:', error);
    return null;
  }
}
