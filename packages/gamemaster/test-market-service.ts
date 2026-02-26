import { MarketDataService } from "./src/services/MarketDataService";

async function test() {
	const service = new MarketDataService();
	console.log("Fetching snapshot...");
	const snapshot = await service.getSnapshot("BCHUSDT");
	console.log("Snapshot:", snapshot);
}

test();
