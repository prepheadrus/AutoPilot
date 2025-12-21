
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Terminal, Bot, Settings, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const bots = [
    { id: 1, name: "BTC-RSI Stratejisi", pair: "BTC/USDT", status: "Çalışıyor", pnl: 12.5, duration: "2g 5sa" },
    { id: 2, name: "ETH-MACD Scalp", pair: "ETH/USDT", status: "Durduruldu", pnl: -3.2, duration: "12sa 15dk" },
    { id: 3, name: "SOL-Trend Follow", pair: "SOL/USDT", status: "Çalışıyor", pnl: 8.9, duration: "5g 1sa" },
    { id: 4, name: "AVAX Arbitraj", pair: "AVAX/USDT", status: "Hata", pnl: 0, duration: "1sa" },
]

const statusConfig = {
    "Çalışıyor": {
        badge: "default",
        dot: "bg-green-500 animate-pulse",
        icon: <Pause className="h-4 w-4" />,
    },
    "Durduruldu": {
        badge: "secondary",
        dot: "bg-gray-500",
        icon: <Play className="h-4 w-4" />,
    },
    "Hata": {
        badge: "destructive",
        dot: "bg-red-500",
        icon: <Play className="h-4 w-4" />,
    }
}


export default function BotStatusPage() {
    return (
        <div className="flex flex-col h-full p-4 md:p-6 bg-background overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-headline font-bold">Aktif Botlarım</h1>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Bot Oluştur
              </Button>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {bots.map((bot) => (
                    <Card key={bot.id} className="flex flex-col border-l-4 border-transparent data-[status=Çalışıyor]:border-primary data-[status=Hata]:border-destructive" data-status={bot.status}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="font-headline text-xl flex items-center gap-2">
                                        <Bot className="h-5 w-5 text-primary"/> {bot.name}
                                    </CardTitle>
                                    <CardDescription className="pt-2 flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", statusConfig[bot.status as keyof typeof statusConfig].dot)}></div>
                                        <Badge variant={statusConfig[bot.status as keyof typeof statusConfig].badge as any}>{bot.status}</Badge>
                                        <span className="text-muted-foreground font-mono text-xs">{bot.pair}</span>
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon">
                                        {statusConfig[bot.status as keyof typeof statusConfig].icon}
                                    </Button>
                                     <Button variant="ghost" size="icon">
                                        <Settings className="h-4 w-4"/>
                                    </Button>
                                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Toplam K&Z</span>
                                <span className={cn("text-lg font-bold", bot.pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                                    {bot.pnl >= 0 ? '+' : ''}{bot.pnl.toFixed(2)}%
                                </span>
                            </div>
                             <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Çalışma Süresi</span>
                                <span className="text-lg font-bold">{bot.duration}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Terminal className="h-5 w-5" /> Genel Bot Kayıtları</CardTitle>
                    <CardDescription>Tüm stratejilerdeki bot aktivitelerinin canlı yayını.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-black rounded-lg p-4 font-mono text-sm text-white/90 h-64 overflow-y-auto space-y-1">
                        <p><span className="text-foreground">[BİLGİ]</span> [10:00:00] "BTC-RSI Stratejisi" botu başlatıldı.</p>
                        <p><span className="text-accent">[İŞLEM]</span> [10:05:12] 0.1 BTC @ 68123.45 USDT ALINDI.</p>
                        <p><span className="text-accent">[İŞLEM]</span> [10:15:30] 0.1 BTC @ 68456.78 USDT SATILDI. K&Z: +$33.33</p>
                        <p><span className="text-muted-foreground">[UYARI]</span> [10:18:00] Binance'de ETH/USDT çifti için yüksek kayma tespit edildi.</p>
                        <p><span className="text-destructive">[HATA]</span> [10:20:00] "AVAX Arbitraj" botu Kraken API'sine bağlanamadı.</p>
                        <p><span className="text-foreground">[BİLGİ]</span> [10:22:00] "ETH-MACD Scalp" botu kullanıcı tarafından duraklatıldı.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
