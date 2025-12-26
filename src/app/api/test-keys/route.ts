
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

    console.log(`[test-keys] Received test request for network: ${networkType}`);

    // Create Binance API client using the robust BinanceAPI class
    const binance = new BinanceAPI({
      apiKey,
      apiSecret: secretKey,
      networkType,
    });

    // Test connection by pinging the server
    const pingSuccess = await binance.ping();
    if (!pingSuccess) {
      console.error('[test-keys] Ping failed for network:', networkType);
      return NextResponse.json(
        { success: false, message: `Binance API'ye bağlanılamadı (${networkType}). Lütfen network tipini ve sunucu durumunu kontrol edin.` },
        { status: 500 }
      );
    }
    console.log('[test-keys] Ping successful, testing credentials...');

    // Validate credentials by fetching account info
    const credentialsTest = await binance.testCredentials();
    console.log('[test-keys] Credentials test result:', credentialsTest);

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
      networkType, // Return the tested network type
    });

  } catch (error: any) {
    console.error('API anahtar testi rotasında hata:', error.message);
    let errorMessage = error.message || 'Bilinmeyen bir hata oluştu.';

    // Add specific error handling for common Binance errors
    if (typeof errorMessage === 'string' && errorMessage.includes('-2015')) {
      errorMessage = "Kimlik doğrulama hatası (Kod: -2015). Lütfen API anahtarınızın doğru izinlere (özellikle Spot veya Futures için) sahip olduğundan ve IP kısıtlaması varsa sunucu IP'sinin eklendiğinden emin olun.";
    } else if (typeof errorMessage === 'string' && errorMessage.includes('-2008')) {
        errorMessage = `Geçersiz API Anahtarı (Kod: -2008). Lütfen girdiğiniz anahtarın doğru olduğundan emin olun.`
    } else if (typeof errorMessage === 'string' && errorMessage.includes('testnet/sandbox mode is not supported for futures')) {
      errorMessage = "Futures Testnet yapılandırma hatası. CCXT kütüphanesi bu modu artık desteklemiyor. Lütfen geliştiriciyle iletişime geçin.";
    }


    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
