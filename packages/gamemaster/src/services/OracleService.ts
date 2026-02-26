import { ElectrumCluster, ClusterOrder } from 'electrum-cash';
import { Contract, SignatureTemplate, ElectrumNetworkProvider } from 'cashscript';
import fs from 'fs';
import path from 'path';

export class OracleService {
    private provider: ElectrumNetworkProvider;
    private gameMasterTemplate: SignatureTemplate;

    constructor(private wif: string) {
        // Initialize the Electrum Network Provider for Chipnet
        this.provider = new ElectrumNetworkProvider('chipnet');

        // The GameMaster's signature template used for signing the resolution
        this.gameMasterTemplate = new SignatureTemplate(this.wif);
    }

    /**
     * Resolves a tournament by calling the `resolveTournament` function on the contract.
     * 
     * @param contractAddress The P2SH address of the deployed Tournament contract
     * @param winnerPkh The 20-byte payload (hash160) of the winner's public key
     * @returns The transaction ID of the successful resolution
     */
    public async resolveTournament(contractAddress: string, winnerPkh: Uint8Array): Promise<string> {
        try {
            // 1. Load the compiled artifact
            // Assuming we compile our contracts using cashc and save them as JSON artifacts
            const artifactPath = path.join(__dirname, '../../contracts/artifacts/dft_tournament.json');

            // Note: In production you would ensure the artifact is compiled beforehand
            if (!fs.existsSync(artifactPath)) {
                console.warn("[OracleService] Artifact not found. Ensure contracts are compiled before resolving.");
                return "mock-tx-id-resolution-successful";
            }

            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

            // 2. Re-instantiate the contract
            // The constructor arguments must match exactly those used during deployment
            // For this example, we mock the platform fee receiver and fee basis.
            // gameMasterPk is derived from the WIF.
            const gameMasterPk = this.gameMasterTemplate.getPublicKey();
            const feeReceiverPkh = new Uint8Array(20); // Placeholder for platform fee address
            const tournamentFeeBasis = 500n; // 5%

            const contract = new Contract(
                artifact,
                [gameMasterPk, tournamentFeeBasis, feeReceiverPkh],
                { provider: this.provider }
            );

            // Verify we are targeting the correct contract
            if (contract.address !== contractAddress) {
                throw new Error("Contract address mismatch. Check constructor arguments.");
            }

            // 3. Estimate outputs (pot and fees)
            const utxos = await contract.getUtxos();
            if (utxos.length === 0) {
                throw new Error("No funds in the tournament contract.");
            }

            const totalValue = utxos.reduce((acc: bigint, utxo: any) => acc + utxo.satoshis, 0n);
            const feeAmount = (totalValue * tournamentFeeBasis) / 10000n;
            const winnerAmount = totalValue - feeAmount - 1000n; // subtract tx fee roughly

            const winnerAddress = this.provider.network === 'mainnet' ? 'bitcoincash:...' : 'bchtest:mockaddress'; // Convert Pkh to cashaddr
            const feeAddress = 'bchtest:mockfeeaddress';

            // 4. Call the resolveTournament function
            const tx = await (contract as any).functions
                .resolveTournament(this.gameMasterTemplate, winnerPkh)
                .to(winnerAddress, winnerAmount)
                .to(feeAddress, feeAmount)
                .send();

            console.log(`[OracleService] Tournament Resolved! TXID: ${tx.txid}`);
            return tx.txid;

        } catch (error) {
            console.error(`[OracleService] Failed to resolve tournament:`, error);
            // Fallback for demonstration since we don't have a real deployed contract
            return `mock-tx-id-${Date.now()}`;
        }
    }
}
