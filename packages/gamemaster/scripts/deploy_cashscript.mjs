import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ElectrumNetworkProvider, Contract } from 'cashscript';
import { TestNetWallet } from 'mainnet-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Setup basic configurations for Testnet (Chipnet)
const NETWORK = 'chipnet';
const SEED_PHRASE = process.env.ESCROW_SEED_PHRASE;
const WIF_KEY = process.env.ORACLE_WIF;

async function deployContracts() {
    console.log(`\n--- DeFight Smart Contract Deployment (${NETWORK}) ---\n`);

    let wallet;
    if (SEED_PHRASE) {
        console.log("Found ESCROW_SEED_PHRASE in .env. Deriving wallet...");
        // Use the standard derivation path for BCH m/44'/145'/0'/0/0
        const derivationPath = "m/44'/145'/0'/0/0";
        wallet = await TestNetWallet.fromSeed(SEED_PHRASE, derivationPath);
    } else if (WIF_KEY && !WIF_KEY.startsWith('cTnxu')) {
        wallet = await TestNetWallet.fromWIF(WIF_KEY);
    } else {
        console.log("Generating a fresh Random Testnet wallet for deployment testing...");
        wallet = await TestNetWallet.newRandom();
    }
    console.log(`Oracle Address: ${wallet.cashaddr}`);
    const oraclePubKey = wallet.getPublicKeyCompressed();

    // Initialize Provider
    const provider = new ElectrumNetworkProvider(NETWORK);
    console.log(`Connected to Electrum node on ${NETWORK}`);

    // --- Deploy Tournament Contract ---
    console.log(`\nDeploying Tournament Contract...`);
    const tournamentArtifactPath = path.join(__dirname, '../contracts/artifacts/dft_tournament.json');
    if (!fs.existsSync(tournamentArtifactPath)) {
        throw new Error(`Tournament artifact not found. Run 'npx cashc contracts/dft_tournament.cash' first.`);
    }
    const tournamentArtifact = JSON.parse(fs.readFileSync(tournamentArtifactPath, 'utf8'));

    // Constructor arguments must exactly match the .cash file:
    // pubkey gameMasterPk, int tournamentFeeBasis, bytes20 feeReceiverPkh
    const feeBasis = 500n; // 5%
    const feeReceiverPkh = new Uint8Array(20); // Dummy 20-byte payload for testing

    const tournamentContract = new Contract(
        tournamentArtifact,
        [oraclePubKey, feeBasis, feeReceiverPkh],
        { provider }
    );

    console.log(`✅ Tournament Contract Address: ${tournamentContract.address}`);
    console.log(`   Save this address for your frontend and Oracle configuration!`);

    // --- Deploy Marketplace Contract ---
    console.log(`\nDeploying Marketplace Contract...`);
    const marketArtifactPath = path.join(__dirname, '../contracts/artifacts/dft_market.json');
    if (!fs.existsSync(marketArtifactPath)) {
        throw new Error(`Marketplace artifact not found. Run 'npx cashc contracts/dft_market.cash' first.`);
    }
    const marketArtifact = JSON.parse(fs.readFileSync(marketArtifactPath, 'utf8'));

    // Constructor arguments for Market: bytes20 sellerPkh, int price
    const sellerPkh = new Uint8Array(20); // Dummy payload
    const price = 10000n; // 10,000 satoshis ~ $0.05

    const marketContract = new Contract(
        marketArtifact,
        [sellerPkh, price],
        { provider }
    );

    console.log(`✅ Marketplace Template Contract Address: ${marketContract.address}`);
    console.log(`\nDeployment check complete!`);
}

deployContracts().catch(console.error);
