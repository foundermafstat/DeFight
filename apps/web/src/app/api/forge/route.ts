import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are an AI assistant for the DeFight crypto game.
Your task is to convert the user's trading strategy description into a strict JSON format.
The bot has three basic functions: buy, sell, hold.
You must generate sets of indicators and risk management parameters for decision making.
The response format must be STRICTLY JSON:
{
  "name": "Bot Name",
  "description": "Short description of the strategy",
  "pairs": ["BCH/USD"],
  "strategy": {
    "buy_indicators": ["RSI < 30", "MACD cross"],
    "sell_indicators": ["RSI > 70", "Price drop 5%"],
    "risk_tolerance": 0.5
  }
}
`;

export async function POST(req: Request) {
    try {
        const { prompt, pairs } = await req.json();

        if (!prompt) {
            return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Create a strategy based on this description: "${prompt}". Trading pairs: ${pairs?.join(', ') || 'Determine from prompt'}` }
            ],
            response_format: { type: "json_object" }
        });

        const botData = JSON.parse(completion.choices[0].message.content || "{}");

        // TODO: Сохранить botData в БД (Supabase)

        return NextResponse.json({ success: true, bot: botData });
    } catch (error) {
        console.error("Forge Error:", error);
        return NextResponse.json({ success: false, error: "Failed to generate bot" }, { status: 500 });
    }
}
