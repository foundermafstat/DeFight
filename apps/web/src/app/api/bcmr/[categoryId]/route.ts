import { NextResponse } from 'next/server';
import { BcmrService, BotStats } from '@aibattles/gamemaster/src/services/BcmrService';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ categoryId: string; }>; }
) {
	try {
		const { categoryId } = await params;

		if (!categoryId) {
			return new NextResponse('Category ID is required', { status: 400 });
		}

		// Initialize BCMR Service
		const bcmrService = new BcmrService(categoryId);

		// TODO: In production, fetch `bots` from Supabase where `category_id` = categoryId
		// Mock data for demonstration:
		const mockBots: BotStats[] = [
			{
				tokenId: "01",
				name: "QuantZilla Bot",
				level: 5,
				winRate: 0.75,
				tournamentsPlayed: 20,
				pnl: 120.50
			},
			{
				tokenId: "02",
				name: "Alpha Strike",
				level: 2,
				winRate: 0.40,
				tournamentsPlayed: 5,
				pnl: -14.20
			}
		];

		const bcmrJson = bcmrService.generateDynamicBcmr(mockBots);

		// Return JSON with appropriate caching headers
		// A short cache helps reduce DB load while keeping data fresh after tournaments
		return NextResponse.json(bcmrJson, {
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
				'Access-Control-Allow-Origin': '*' // Wallets must be able to read this
			}
		});

	} catch (error) {
		console.error("BCMR Error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
