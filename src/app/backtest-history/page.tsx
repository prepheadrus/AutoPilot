'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, Eye, LineChart, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BacktestRun } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function BacktestHistoryPage() {
    const [history, setHistory] = useState<BacktestRun[]>([]);
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        try {
            const storedHistory = localStorage.getItem('backtestHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Backtest geçmişi yüklenirken hata:", error);
            toast({
                title: "Geçmiş Yüklenemedi",
                description: "Backtest geçmişi verileri bozuk olabilir.",
                variant: "destructive"
            });
        }
    }, [toast]);

    const handleDelete = (id: number) => {
        if (window.confirm("Bu backtest sonucunu kalıcı olarak silmek istediğinizden emin misiniz?")) {
            const newHistory = history.filter(run => run.id !== id);
            setHistory(newHistory);
            try {
                localStorage.setItem('backtestHistory', JSON.stringify(newHistory));
                toast({ title: "Başarılı", description: "Backtest sonucu silindi." });
            } catch (error) {
                console.error("Backtest geçmişi silinirken hata:", error);
                toast({ title: "Hata", description: "Sonuç silinemedi.", variant: "destructive" });
            }
        }
    };

    const handleViewReport = (id: number) => {
        router.push(`/editor?reportId=${id}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <History className="h-8 w-8"/>
                    Backtest Geçmişi
                </h1>
            </div>

            {isClient && history.length === 0 && (
                <Card className="text-center py-16">
                    <CardHeader>
                        <LineChart className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <CardTitle className="mt-4">Henüz Backtest Yapılmadı</CardTitle>
                        <CardDescription>
                            Strateji editörüne giderek ilk backtest'inizi yapın. Sonuçlar burada arşivlenecektir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/editor')}>
                            Editöre Git
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {isClient && history.map((run) => (
                    <Card key={run.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <CardTitle className="font-headline text-lg">{run.params.symbol}</CardTitle>
                                <Badge variant={run.result.stats.netProfit >= 0 ? "default" : "destructive"}>
                                    {run.result.stats.netProfit >= 0 ? '+' : ''}{run.result.stats.netProfit.toFixed(2)}%
                                </Badge>
                            </div>
                            <CardDescription>
                                {format(new Date(run.params.dateRange.from), 'dd MMM yyyy', { locale: tr })} - {format(new Date(run.params.dateRange.to), 'dd MMM yyyy', { locale: tr })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow grid grid-cols-2 gap-4 text-sm">
                             <div>
                                <p className="text-muted-foreground">Zaman Dilimi</p>
                                <p className="font-medium">{run.params.timeframe}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Toplam İşlem</p>
                                <p className="font-medium">{run.result.stats.totalTrades}</p>
                            </div>
                             <div>
                                <p className="text-muted-foreground">Başarı Oranı</p>
                                <p className="font-medium">{run.result.stats.winRate.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Test Tarihi</p>
                                <p className="font-medium">{format(new Date(run.id), 'dd.MM.yyyy HH:mm')}</p>
                            </div>
                        </CardContent>
                        <div className="p-4 border-t flex gap-2">
                             <Button onClick={() => handleViewReport(run.id)} className="w-full">
                                <Eye className="mr-2 h-4 w-4"/> Raporu Görüntüle
                            </Button>
                            <Button onClick={() => handleDelete(run.id)} variant="outline" size="icon">
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    </Card>
                ))}
                {!isClient && (
                    <>
                        {Array.from({length: 3}).map((_, i) => (
                            <Card key={i}><CardHeader><CardTitle>Yükleniyor...</CardTitle></CardHeader><CardContent className="h-48"></CardContent></Card>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
