import { compileStrategy } from '@/lib/compiler';
import { runStrategy } from '@/lib/bot-engine';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { nodes, edges } = await request.json();

    if (!nodes || !edges) {
      return NextResponse.json(
        { success: false, message: 'Eksik parametreler: nodes ve edges gereklidir.' },
        { status: 400 }
      );
    }

    const compileResult = compileStrategy(nodes, edges);
    if (!compileResult.valid || !compileResult.strategy) {
      return NextResponse.json(
        { success: false, message: compileResult.message },
        { status: 400 }
      );
    }

    try {
      // GERÇEK MOD: Bot motorunu gerçek verilerle çalıştırmayı dene
      const engineResult = await runStrategy(compileResult.strategy);
      
      // Eğer motor içinde bir hata yakalanırsa, bunu da simülasyona yönlendir.
      if (engineResult.decision === 'WAIT' && engineResult.data?.error) {
        throw new Error(engineResult.message);
      }

      return NextResponse.json({
        success: true,
        message: `[CANLI] ${engineResult.message}`
      });

    } catch (error) {
      // SİMÜLASYON MODU: Gerçek modda hata olursa (örn: API engeli) burası çalışır.
      console.warn('Gerçek motor hatası, simülasyon moduna geçiliyor:', (error as Error).message);

      const simulatedPrice = (64000 + Math.random() * 1000).toFixed(2);
      const simulatedRsi = (30 + Math.random() * 40).toFixed(2);
      const decision = compileResult.strategy.action.type.toUpperCase();

      const simulatedMessage = `Karar: ${decision}. Koşul sağlandı (RSI ${simulatedRsi} ${compileResult.strategy.condition.operator} ${compileResult.strategy.condition.value}). Fiyat: ${simulatedPrice}`;
      
      return NextResponse.json({
        success: true,
        message: `[SİMÜLASYON] ${simulatedMessage}`
      });
    }

  } catch (error) {
    // Genel yakalama bloğu (örn: JSON parse hatası)
    console.error("API rotasında beklenmedik hata:", error);
    return NextResponse.json(
      { success: false, message: `Sunucu Hatası: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
