# CryptoAutomat 🚀

Gerçek zamanlı kripto para piyasa verileri, teknik analiz ve otomatik trading bot oluşturma platformu.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknoloji Stack](#-teknoloji-stack)
- [Mimari](#-mimari)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [Geliştirme](#-geliştirme)

## ✨ Özellikler

### Market Analizi
- **Binance Entegrasyonu**: Binance borsası ile tam entegrasyon
- **Gerçek Zamanlı Veriler**: CCXT kütüphanesi ile canlı Binance piyasa verileri
- **Gelişmiş Arama**: Tüm USDT çiftlerinde debounced arama (500ms)
- **Favori Sistemi**: localStorage ile kalıcı favori coin listesi
- **TradingView Grafikleri**: Binance verili profesyonel iframe embed grafikleri
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu arayüz

### Trading Bot Editörü
- Sürükle-bırak bot oluşturma arayüzü
- Teknik gösterge desteği
- Strateji backtesting
- Otomatik trade execution

### Dashboard
- Portföy yönetimi
- Performans metrikleri
- Trade geçmişi

## 🛠 Teknoloji Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **React**: 19.x
- **TypeScript**: Tip güvenli geliştirme
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

### Backend & API
- **API Routes**: Next.js API Routes
- **Exchange Integration**: CCXT
- **Real-time Data**: REST API polling

### External Services
- **TradingView**: Gelişmiş grafik widget'ları
- **Cryptocurrency Exchanges**: 6 farklı borsa API'si

## 🏗 Mimari

### Uygulama Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Market     │  │   Editor     │  │  Dashboard   │      │
│  │   Terminal   │  │    Page      │  │     Page     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes (/api/*)                      │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ market-data  │  │  bot-config  │  ...            │  │
│  │  └──────────────┘  └──────────────┘                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      CCXT Library                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Binance KuCoin│ │Bybit │ │Kraken│ │ OKX  │ │Gate.io   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Veri Akışı (Market Sayfası)

```
User Input (Exchange + Search)
        │
        ▼
Debounced Search (500ms)
        │
        ▼
API: /api/market-data?exchange=binance&search=btc
        │
        ▼
CCXT: fetchMarkets() + fetchTickers()
        │
        ▼
Response: { tickers, source, exchange, totalAvailable }
        │
        ▼
React State Update
        │
        ├─► MarketList: Coin listesi
        └─► TradingViewWidget: Grafik widget
```

### Önemli Tasarım Kararları

1. **TradingView Logic**:
   - Arama yoksa → Favoriler gösterilir
   - Arama varsa → Tüm sonuçlar gösterilir

2. **Performance Optimizations**:
   - `memo()` ile component re-render önleme
   - `useMemo()` ile expensive hesaplamalar
   - Debounced search ile API çağrısı optimizasyonu

3. **State Management**:
   - React Context yerine direct API calls (daha iyi performance)
   - localStorage ile client-side persistence

## 📦 Kurulum

### Gereksinimler

- Node.js 18.x veya üzeri
- npm veya yarn package manager

### Adımlar

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/prepheadrus/CryptoAutomat.git
cd CryptoAutomat
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
# veya
yarn install
```

3. **Environment variables (opsiyonel)**
```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenleyin:
```env
# API Rate Limiting (opsiyonel)
RATE_LIMIT_ENABLED=false

# Exchange API Keys (opsiyonel - sadece trading için gerekli)
# BINANCE_API_KEY=your_api_key
# BINANCE_SECRET_KEY=your_secret_key
```

4. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
# veya
yarn dev
```

5. **Tarayıcıda açın**
```
http://localhost:3000
```

## 🎯 Kullanım

### Market Analizi

1. **Borsa Seçimi**: Dropdown'dan istediğiniz borsayı seçin
2. **Coin Arama**: Arama kutusuna coin adı yazın (örn: BTC, ETH, SOL)
3. **Favori Ekleme**: Yıldız ikonuna tıklayarak favorilere ekleyin
4. **Grafik İnceleme**: Coin'e tıklayarak TradingView grafiğini görüntüleyin

### Bot Oluşturma

1. Market sayfasından "Bu Varlıkla Bot Oluştur" butonuna tıklayın
2. Editör sayfasında stratejinizi tasarlayın
3. Backtest çalıştırarak performans analizi yapın

## 📁 Proje Yapısı

```
CryptoAutomat/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   └── market-data/      # Piyasa verisi endpoint
│   │   │       └── route.ts      # CCXT exchange integration
│   │   ├── market/               # Market analiz sayfası
│   │   │   └── page.tsx          # Multi-exchange market terminal
│   │   ├── editor/               # Bot editör sayfası
│   │   ├── dashboard/            # Dashboard sayfası
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Ana sayfa
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── Sidebar.tsx           # Ana navigasyon
│   │   └── ...
│   │
│   ├── context/                  # React Context providers
│   │   └── MarketContext.tsx     # Fallback market data
│   │
│   ├── lib/                      # Utility functions
│   │   └── utils.ts              # Helper functions
│   │
│   └── styles/                   # Global styles
│       └── globals.css           # Tailwind + custom CSS
│
├── public/                       # Static assets
├── .gitignore                    # Git ignore rules
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
└── README.md                     # Bu dosya
```

## 👨‍💻 Geliştirme

### Scripts

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Production sunucusu
npm run start

# Linting
npm run lint

# Type checking
npm run type-check
```

### Kod Standartları

- **TypeScript**: Tüm component'ler ve fonksiyonlar tip güvenli
- **Component Structure**: Functional components + hooks
- **Styling**: Tailwind CSS utility classes
- **State Management**: React hooks + Context API (gerektiğinde)
- **Performance**: memo(), useMemo(), useCallback() ile optimizasyon

### Commit Mesaj Formatı

```
<type>: <kısa açıklama>

<detaylı açıklama>

<değişiklikler>
- Değişiklik 1
- Değişiklik 2
```

**Type örnekleri:**
- `feat`: Yeni özellik
- `fix`: Bug düzeltmesi
- `refactor`: Kod iyileştirmesi
- `style`: Styling değişiklikleri
- `docs`: Dokümantasyon
- `test`: Test ekleme/düzenleme
- `chore`: Diğer değişiklikler

**Örnek:**
```
feat: Add multi-exchange support to market page

Implemented support for 6 major cryptocurrency exchanges
with dynamic coin search and TradingView integration.

Changes:
- Added exchange selector dropdown
- Implemented CCXT integration for real-time data
- Added exchange-specific TradingView widget mapping
- Debounced search for performance optimization
```

## 🔄 Güncel Özellikler (v0.2.0)

### Market Analizi
- ✅ Binance borsası tam entegrasyonu (CCXT)
- ✅ TradingView iframe embed grafikleri
- ✅ Binance-only chart display (doğru borsa garantisi)
- ✅ Favori sistemi (localStorage ile kalıcı)
- ✅ Debounced search (500ms)
- ✅ Responsive design
- ✅ Layout optimizasyonu (cramped panels düzeltildi)

### Planlanan Özellikler
- 🔄 Trading bot editörü geliştirmeleri
- 🔄 Backtesting engine
- 🔄 Live trading execution
- 🔄 Portfolio tracking
- 🔄 Alert/notification sistemi
- 🔄 WebSocket ile real-time updates

## 📝 Lisans

Bu proje kişisel kullanım içindir.

## 🤝 Katkıda Bulunma

Şu anda bu proje aktif geliştirme aşamasındadır.

---

**Son Güncelleme**: 2025-12-24
**Versiyon**: 0.2.0 (Binance iframe embed)
**Geliştirici**: [@prepheadrus](https://github.com/prepheadrus)
