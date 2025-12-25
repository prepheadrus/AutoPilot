import { NextResponse } from 'next/server';
import { BinanceAPI, type OrderSide, type OrderType } from '@/lib/binance-api';

export interface TradeRequest {
  apiKey: string;
  secretKey: string;
  testnet?: boolean;
  symbol: string;
  side: OrderSide;
  type: 'MARKET' | 'LIMIT';
  quantity?: number;
  quoteOrderQty?: number; // For market buy with USDT amount
  price?: number; // Required for LIMIT orders
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export async function POST(request: Request) {
  try {
    const body: TradeRequest = await request.json();
    const {
      apiKey,
      secretKey,
      testnet = false,
      symbol,
      side,
      type,
      quantity,
      quoteOrderQty,
      price,
      timeInForce,
    } = body;

    // Validate required fields
    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { success: false, message: 'API anahtarları gereklidir.' },
        { status: 400 }
      );
    }

    if (!symbol || !side || !type) {
      return NextResponse.json(
        { success: false, message: 'Symbol, side ve type alanları gereklidir.' },
        { status: 400 }
      );
    }

    // Create Binance API client
    const binance = new BinanceAPI({
      apiKey,
      apiSecret: secretKey,
      testnet,
    });

    // Execute trade based on type
    let orderResponse;

    if (type === 'MARKET') {
      // Market order
      orderResponse = await binance.marketOrder({
        symbol,
        side,
        quantity,
        quoteOrderQty,
      });
    } else if (type === 'LIMIT') {
      // Limit order
      if (!price) {
        return NextResponse.json(
          { success: false, message: 'Limit order için price gereklidir.' },
          { status: 400 }
        );
      }

      if (!quantity) {
        return NextResponse.json(
          { success: false, message: 'Limit order için quantity gereklidir.' },
          { status: 400 }
        );
      }

      orderResponse = await binance.limitOrder({
        symbol,
        side,
        quantity,
        price,
        timeInForce: timeInForce || 'GTC',
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Geçersiz order type. MARKET veya LIMIT olmalı.' },
        { status: 400 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      message: `${side} order başarıyla yerleştirildi.`,
      order: {
        orderId: orderResponse.orderId,
        symbol: orderResponse.symbol,
        side: orderResponse.side,
        type: orderResponse.type,
        price: orderResponse.price,
        quantity: orderResponse.origQty,
        executedQty: orderResponse.executedQty,
        status: orderResponse.status,
        transactTime: orderResponse.transactTime,
        fills: orderResponse.fills,
      },
    });

  } catch (error: any) {
    console.error('Trade execution error:', error);

    // Handle specific Binance errors
    let errorMessage = error.message || 'Bilinmeyen bir hata oluştu.';

    if (errorMessage.includes('Invalid API-key')) {
      errorMessage = 'Geçersiz API anahtarı.';
    } else if (errorMessage.includes('Signature')) {
      errorMessage = 'İmza doğrulama hatası. API secret anahtarını kontrol edin.';
    } else if (errorMessage.includes('Insufficient balance')) {
      errorMessage = 'Yetersiz bakiye.';
    } else if (errorMessage.includes('MIN_NOTIONAL')) {
      errorMessage = 'Minimum işlem tutarı karşılanmıyor.';
    }

    return NextResponse.json(
      { success: false, message: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
