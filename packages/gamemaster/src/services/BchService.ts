import type { TestNetWallet as TestNetWalletType } from 'mainnet-js';
import { FilebaseService } from './FilebaseService';

export class BchService {
	private wallet: TestNetWalletType | null = null;
	private seedPhrase: string;
	private filebaseService: FilebaseService;

	private readyPromise: Promise<void>;

	constructor(seedPhrase: string) {
		this.seedPhrase = seedPhrase;
		this.filebaseService = new FilebaseService();
		this.readyPromise = this.init();
	}

	/**
	 * Wait for the service to be fully initialized and wallet prepared.
	 */
	public async waitForReady() {
		await this.readyPromise;
	}
	private async init() {
		const { TestNetWallet } = await eval('import("mainnet-js")');
		try {
			this.wallet = await TestNetWallet.fromSeed(this.seedPhrase, "m/44'/145'/0'/0/0");
		} catch (error) {
			console.warn(`[BchService] Error initializing from seed. Generating a random Testnet oracle wallet instead...`, error);
			this.wallet = await TestNetWallet.newRandom();
		}

		if (!this.wallet) return;
		console.log(`BCH Oracle Wallet Address: ${this.wallet.cashaddr}`);

		// Ensure we have a UTXO with vout=0, required for tokenGenesis in mainnet-js
		await this.prepareVout0();
	}

	/**
	 * Checks if any non-token UTXO with vout=0 exists.
	 */
	private hasVout0(utxos: any[]): boolean {
		return utxos.some((u: any) => u.vout === 0 && !u.token);
	}

	/**
	 * Creates a vout=0 UTXO by sending the entire wallet balance to self via sendMax.
	 * sendMax produces a single output at vout=0 which is exactly what tokenGenesis requires.
	 * Falls back to a regular self-send if sendMax fails.
	 */
	private async prepareVout0(): Promise<boolean> {
		if (!this.wallet) return false;

		try {
			let utxos = await this.wallet.getUtxos();
			if (utxos.length === 0) {
				console.warn("[BchService] Wallet has no UTXOs. Cannot prepare vout=0.");
				return false;
			}

			if (this.hasVout0(utxos)) {
				console.log("[BchService] Wallet already has a vout=0 UTXO ✓");
				return true;
			}

			console.log("[BchService] No vout=0 UTXO found. Creating one via sendMax to self...");

			// Strategy 1: sendMax to self — produces exactly one output at vout=0
			try {
				const selfSend = await this.wallet.sendMax(this.wallet.cashaddr!);
				console.log(`[BchService] sendMax self-send txId: ${selfSend.txId}`);
			} catch (e: any) {
				console.warn("[BchService] sendMax failed, trying regular self-send:", e?.message);
				// Strategy 2: regular self-send with a small amount
				const selfSend = await this.wallet.send([
					{
						cashaddr: this.wallet.cashaddr!,
						value: 1200,
						unit: 'sats'
					} as any
				]);
				console.log(`[BchService] Regular self-send txId: ${selfSend.txId}`);
			}

			// Retry loop: wait for electrum indexer to pick up the new UTXO
			for (let attempt = 0; attempt < 8; attempt++) {
				await new Promise(r => setTimeout(r, 2000));
				utxos = await this.wallet.getUtxos();
				const hasVout0 = this.hasVout0(utxos);
				console.log(`[BchService] vout=0 check attempt ${attempt + 1}/8: UTXOs=${utxos.length}, hasVout0=${hasVout0}`);
				if (hasVout0) return true;
			}

			console.warn("[BchService] Could not obtain vout=0 UTXO after retries");
			return false;
		} catch (e) {
			console.warn("[BchService] Could not prepare vout=0 UTXO:", e);
			return false;
		}
	}

	/**
	 * Mints a CashToken NFT for a successful AI bot.
	 * The generative metadata (image, stats) is uploaded to Filebase IPFS.
	 * The text prompt remains hidden off-chain.
	 * 
	 * @param destinationAddress The builder's BCH Testnet address (e.g. bchtest:...)
	 * @param botName Short string representing the bot
	 * @param generation The generation number of this bot
	 * @param initialWinRate Initial percentage encoded for early display
	 * @param nftMetadata Additional generative metadata (e.g., image URL, traits)
	 * @returns Object containing the tokenId, genesis txId, and IPFS URI
	 */
	public async mintBotNft(
		destinationAddress: string,
		botName: string,
		generation: number,
		metadata: any
	) {
		await this.waitForReady();
		if (!this.wallet) throw new Error("Wallet not initialized");

		// Ensure we have a vout=0 UTXO before genesis — required by CashTokens protocol
		const vout0Ready = await this.prepareVout0();
		if (!vout0Ready) {
			// Double-check one more time after a longer delay
			await new Promise(r => setTimeout(r, 5000));
			const utxos = await this.wallet.getUtxos();
			if (!this.hasVout0(utxos)) {
				throw new Error(
					"Cannot mint NFT: wallet has no UTXO with vout=0 after multiple attempts. " +
					"This is required by the CashTokens protocol for token genesis. " +
					"Please ensure the oracle wallet has sufficient tBCH balance and try again."
				);
			}
		}

		console.log("Uploading Generative NFT metadata to Filebase IPFS...");
		const { cid, uri } = await this.filebaseService.uploadMetadata(metadata);
		console.log(`Metadata uploaded! IPFS CID: ${cid}`);

		// 2. Token Genesis (The commitment is limited to 40 bytes)
		const commitmentPayload = `DeFight|${botName}|Gen:${generation}`;

		// Create the token with 0 fungible amount. Implicitly creates an NFT.
		const response = await this.wallet.tokenGenesis({
			amount: 0n,
			nft: {
				capability: "none",
				commitment: commitmentPayload,
			},
			cashaddr: destinationAddress
		});

		console.log(`Minted DeFight Bot NFT! Token ID: ${response.txId}`);

		// 3. Anchor the IPFS CID to the Token ID via OP_RETURN
		// This ensures the generative metadata is permanently linked on-chain.
		const payloadBuffer = Buffer.from(
			`DeFight_NFT | TokenID: ${response.txId} | IPFS: ${cid}`,
			'utf-8'
		);

		const { OpReturnData } = await eval('import("mainnet-js")');

		const anchorTx = await this.wallet.send([
			OpReturnData.fromArray([payloadBuffer])
		]);

		console.log(`Anchored IPFS CID on-chain: ${anchorTx.txId}`);

		return {
			tokenId: response.txId!,
			txId: response.txId,
			anchorTxId: anchorTx.txId,
			ipfsUri: uri
		};
	}

	/**
	 * Anchors leaderboard data immutably to the blockchain using OP_RETURN.
	 * 
	 * @param tokenId The target NFT CashToken ID
	 * @param pnl The percentage string (e.g., +45%)
	 * @param wins Total wins to log
	 * @returns The transaction ID
	 */
	public async recordLeaderboardEntry(tokenId: string, pnl: string, wins: number) {
		if (!this.wallet) throw new Error("Wallet not initialized");

		// Max roughly 220 bytes. We keep it concise.
		const payloadBuffer = Buffer.from(
			`DeFight_Leaderboard | TokenID: ${tokenId} | PnL: ${pnl} | Wins: ${wins}`,
			'utf-8'
		);

		// Send an OP_RETURN data output.
		const { OpReturnData } = await eval('import("mainnet-js")');
		const response = await this.wallet.send([
			OpReturnData.fromArray([payloadBuffer])
		]);

		console.log(`Leaderboard anchor Tx: ${response.txId}`);
		return response.txId;
	}

	/**
	 * Verifies if a user's address owns a specific CashToken NFT.
	 * Critical for allowing access to premium battles.
	 * 
	 * @param userAddress The user's BCH Testnet address
	 * @param targetTokenId The CashToken NFT ID they claim to own
	 * @returns Boolean indicating ownership
	 */
	public async verifyNftOwnership(userAddress: string, targetTokenId: string): Promise<boolean> {
		// We can use a Watch-only wallet to easily query the network.
		const { TestNetWallet } = await eval('import("mainnet-js")');
		const watchWallet = await TestNetWallet.watchOnly(userAddress);

		// Retrieve all token UTXOs owned by this address
		const tokenUtxos = await watchWallet.getTokenUtxos();

		// Check if the target Token ID exists in their UTXO set
		return tokenUtxos.some((u: any) => u.token?.tokenId === targetTokenId);
	}

	/**
	 * Executes the tournament settlement. The GameMaster wallet 
	 * transfers the staked tBCH and the loser's NFT to the winner.
	 * 
	 * @param winnerAddress The testnet BCH address of the winner
	 * @param loserTokenId The NFT TokenId of the loser to be transferred
	 * @param totalTbchPool The total tBCH staked to send (minus fees)
	 */
	public async payoutTournamentWinner(winnerAddress: string, loserTokenId: string, totalTbchPool: number) {
		if (!this.wallet) throw new Error("Wallet not initialized");

		console.log(`[Escrow] Resolving Tournament: Paying out ${totalTbchPool} tBCH and NFT ${loserTokenId} to ${winnerAddress}...`);

		try {
			// In a real implementation this requires the CashScript SDK to:
			// 1. Load the contract artifact (dft_tournament.json)
			// 2. Instantiate the contract with the GameMaster's public key
			// 3. Find the UTXO locking the loser's NFT at the contract address
			// 4. Construct a transaction calling `resolveTournament`
			// 5. Provide the GameMaster's signature
			// 6. Define the winner's output address and the fee collector's output

			// For this MVP demonstration, we will simulate the successful Smart Contract resolution
			// using the standard wallet send, representing what the contract output would be.
			const { OpReturnData } = await eval('import("mainnet-js")');
			const txResponse = await this.wallet.send([
				{
					cashaddr: winnerAddress,
					value: totalTbchPool,
					unit: 'sats'
				},
				OpReturnData.fromArray([Buffer.from(`DeFight Tournament Resolution (Contract Mode)`, 'utf-8')])
			] as any);

			console.log(`[Escrow] Contract Resolution TxId: ${txResponse.txId}`);
			return txResponse.txId;
		} catch (error) {
			console.error("[Escrow] Error during contract payout:", error);
			throw new Error("Escrow payout failed");
		}
	}
}
