import { TestNetWallet, OpReturnData } from 'mainnet-js';
import { FilebaseService } from './FilebaseService';

export class BchService {
    private wallet: TestNetWallet | null = null;
    private wif: string;
    private filebaseService: FilebaseService;

    constructor(wif: string) {
        this.wif = wif;
        this.filebaseService = new FilebaseService();
    }

    /**
     * Initialize the Oracle server wallet.
     */
    public async init() {
        this.wallet = await TestNetWallet.fromWIF(this.wif);
        console.log(`BCH Oracle Wallet Address: ${this.wallet.cashaddr}`);
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
        initialWinRate: string,
        nftMetadata: any = {}
    ) {
        if (!this.wallet) throw new Error("Wallet not initialized");

        // 1. Upload generative NFT metadata to Filebase IPFS
        const fullMetadata = {
            name: botName,
            description: `DeFight Generative AI Bot - Gen ${generation}`,
            attributes: [
                { trait_type: "Generation", value: generation },
                { trait_type: "Initial Win Rate", value: initialWinRate },
                ...(nftMetadata.attributes || [])
            ],
            image: nftMetadata.image || "",
            // Add any other standard NFT properties
        };

        console.log("Uploading Generative NFT metadata to Filebase IPFS...");
        const { cid, uri } = await this.filebaseService.uploadMetadata(fullMetadata);
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
        const watchWallet = await TestNetWallet.watchOnly(userAddress);

        // Retrieve all token UTXOs owned by this address
        const tokenUtxos = await watchWallet.getTokenUtxos();

        // Check if the target Token ID exists in their UTXO set
        return tokenUtxos.some((u: any) => u.token?.tokenId === targetTokenId);
    }
}
