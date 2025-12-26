
import { NextResponse } from 'next/server';
import { BinanceAPI } from '@/lib/binance-api';

export async function POST(request: Request) {
  try {
    const { apiKey, secretKey, testnet = false, networkType = 'mainnet' } = await request.json();

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { success: false, message: 'API anahtarı ve gizli anahtar gereklidir.' },
        { status: 400 }
      );
    }

    // Create Binance API client (backwards compatible with testnet boolean)
    const binance = new BinanceAPI({
      apiKey,
      apiSecret: secretKey,
      testnet, // Backwards compatibility
      networkType,
    });

    // Test connection
    const pingSuccess = await binance.ping();
    if (!pingSuccess) {
      console.error('[test-keys] Ping failed for network:', networkType);
      return NextResponse.json(
        { success: false, message: `Binance API'ye bağlanılamadı (${networkType}). Lütfen network tipini kontrol edin veya konsol loglarına bakın.` },
        { status: 500 }
      );
    }

    // Validate credentials
    const credentialsTest = await binance.testCredentials();
    if (!credentialsTest.valid) {
      return NextResponse.json(
        { success: false, message: credentialsTest.message },
        { status: 401 }
      );
    }

    // Get account info to confirm all permissions
    const accountInfo = await binance.getAccountInfo();

    return NextResponse.json({
      success: true,
      message: credentialsTest.message,
      accountInfo: {
        canTrade: accountInfo.canTrade,
        canWithdraw: accountInfo.canWithdraw,
        canDeposit: accountInfo.canDeposit,
      },
      networkType,
      testnet, // Backwards compatibility
    });

  } catch (error: any) {
    console.error('API anahtar testi hatası:', error.message);
    let errorMessage = error.message || 'Bilinmeyen bir hata oluştu.';

    // Add specific error handling for code -2015 as requested
    if (typeof errorMessage === 'string' && errorMessage.includes('-2015')) {
      errorMessage = "Kimlik doğrulama hatası (Kod: -2015). Lütfen API anahtarınızın Spot Testnet için doğru izinlere sahip olduğundan ve IP kısıtlaması varsa sunucu IP'sinin eklendiğinden emin olun.";
    } else if (typeof errorMessage === 'string' && errorMessage.includes('testnet/sandbox mode is not supported for futures')) {
      errorMessage = "Futures Testnet yapılandırma hatası. CCXT kütüphanesi bu modu artık desteklemiyor. Lütfen geliştiriciyle iletişime geçin.";
    }


    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
