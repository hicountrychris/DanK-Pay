import express from 'express';
import cors from 'cors';
import { Connection, clusterApiUrl, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const fromWallet = Keypair.generate();

(async () => {
    const airdropSig = await connection.requestAirdrop(fromWallet.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log('Airdropped 1 SOL to backend wallet:', fromWallet.publicKey.toBase58());
})();

app.post('/mint', async (req, res) => {
    try {
        const toWallet = new PublicKey(req.body.wallet);
        const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9);
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromWallet.publicKey);
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet);

        await mintTo(connection, fromWallet, mint, fromTokenAccount.address, fromWallet, 1000000000); // 1 token with 9 decimals
        await transfer(connection, fromWallet, fromTokenAccount.address, toTokenAccount.address, fromWallet.publicKey, 1000000000);

        res.json({
            mint: mint.toBase58(),
            explorer: `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Minting failed');
    }
});

app.listen(port, () => console.log(`Backend server running on port ${port}`));