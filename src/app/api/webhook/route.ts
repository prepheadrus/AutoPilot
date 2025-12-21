
import { NextResponse } from 'next/server';
import { executeTrade } from '@/lib/trade-executor';
import { z } from 'zod';
import type { Bot, BotConfig } from '@/lib/types';
import { Mutex } from 'async-mutex';

// Define a schema for the incoming webhook payload for validation
const WebhookPayloadSchema = z.object({
    botId: z.number().int().positive(),
    secret: z.string().uuid(),
    action: z.enum(['buy', 'sell']),
    // Optional fields that can override bot settings
    symbol: z.string().optional(),
    amount: z.number().optional(),
    leverage: z.number().optional(),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// In-memory lock to prevent race conditions for the same botId.
// In a distributed system, this would be a distributed lock (e.g., Redis Redlock).
const locks: { [botId: number]: Mutex } = {};

function getLock(botId: number): Mutex {
    if (!locks[botId]) {
        locks[botId] = new Mutex();
    }
    return locks[botId];
}


// Mock function to simulate fetching bot data from a database
// In a real app, this would query your database (e.g., Firestore)
async function getBotById(botId: number): Promise<Bot | null> {
    // This is a simulation. We can't access localStorage on the server.
    // We'll return a mock bot configuration.
    // A real implementation needs a proper database.
    if (botId > 0) {
        return {
            id: botId,
            name: `Webhook Bot #${botId}`,
            pair: "BTC/USDT",
            status: "Çalışıyor",
            pnl: 0,
            duration: "N/A",
            config: {
                mode: 'LIVE',
                stopLoss: 5,
                takeProfit: 10,
                trailingStop: false,
                amountType: 'fixed',
                amount: 100, // Default amount
                leverage: 5,   // Default leverage
            },
            // Simulate a unique secret for each bot
            webhookSecret: 'd9e1e247-6063-4a32-9a3b-9b4f7e2a4c24' // THIS SHOULD BE UNIQUE PER BOT
        };
    }
    return null;
}


export async function POST(request: Request) {
    let payload: WebhookPayload;

    // 1. Validate incoming JSON
    try {
        const body = await request.json();
        payload = WebhookPayloadSchema.parse(body);
    } catch (error) {
        console.error("[Webhook] Invalid payload:", error);
        return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
    }

    const { botId, secret } = payload;
    const lock = getLock(botId);
    
    // 3. Acquire Lock to prevent race conditions
    if (lock.isLocked()) {
        console.warn(`[Webhook] Bot ${botId} is already processing a trade. Ignoring new signal.`);
        return NextResponse.json({ success: false, message: 'Bot is busy. Signal ignored.' }, { status: 429 }); // 429 Too Many Requests
    }

    const release = await lock.acquire();

    try {
        console.log(`[Webhook] Received signal for bot ${botId}: ${payload.action}`);

        // 2. Fetch bot config and validate secret
        // In a real app, this would be a secure database lookup.
        const bot = await getBotById(botId);

        if (!bot) {
            return NextResponse.json({ success: false, message: 'Bot not found.' }, { status: 404 });
        }
        
        // This is a critical security step.
        if (!bot.webhookSecret || bot.webhookSecret !== secret) {
            return NextResponse.json({ success: false, message: 'Invalid secret.' }, { status: 403 });
        }
        console.log(`[Webhook] Bot ${botId} secret validated.`);

        // In a real app, API keys would be fetched from a secure vault (e.g., HashiCorp Vault, GCP Secret Manager)
        // using the bot's user ID. We simulate this by using environment variables.
        const apiKey = process.env.API_KEY;
        const secretKey = process.env.API_SECRET;

        if (!apiKey || !secretKey) {
             console.error("[Webhook] Exchange API keys are not configured on the server.");
             return NextResponse.json({ success: false, message: 'Server is not configured for live trading.' }, { status: 500 });
        }

        // Override bot config with payload values if they exist
        const finalConfig: BotConfig = {
            ...bot.config,
            amount: payload.amount || bot.config.amount,
            leverage: payload.leverage || bot.config.leverage,
        };
        const finalSymbol = payload.symbol || bot.pair;

        console.log(`[Webhook] Executing trade for ${finalSymbol} with action ${payload.action}`);
        
        // Execute the trade
        const tradeResult = await executeTrade(
            finalSymbol,
            payload.action,
            finalConfig,
            { apiKey, secretKey }
        );

        console.log(`[Webhook] Trade execution result for bot ${botId}:`, tradeResult);
        
        // A real app would log this result to a database associated with the bot.

        return NextResponse.json({ success: true, message: tradeResult.message });

    } catch (error: any) {
        console.error(`[Webhook] Error processing webhook for bot ${botId}:`, error);
        // A real app would log this error to a monitoring service
        return NextResponse.json({ success: false, message: error.message || 'An internal error occurred.' }, { status: 500 });
    } finally {
        // 3. Release the lock
        release();
        console.log(`[Webhook] Lock released for bot ${botId}`);
    }
}
