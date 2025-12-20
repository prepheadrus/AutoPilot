import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Şimdilik gelen isteği ayrıştırmadan direkt başarılı bir cevap dönüyoruz.
    // Bu, 400 Bad Request hatasını önler ve frontend testini kolaylaştırır.
    const message = `Motor Başlatıldı: BTC Fiyatı 65.430$ | RSI: 42 | Sinyal: AL (${new Date().toLocaleTimeString()})`;
    return NextResponse.json({ success: true, message: message });
  } catch (error) {
    console.error("API rotasında beklenmedik hata:", error);
    // Hata durumunda bile frontend'in işleyebileceği bir mesaj dönüyoruz.
    // Status 200 dönmek, frontend'in hatayı yakalamasını kolaylaştırır.
    return NextResponse.json(
      { success: false, message: "Motor Hatası: Sunucu loglarını kontrol edin." },
      { status: 500 } // Genellikle 500 daha doğru bir durum kodudur.
    );
  }
}
