import 'dotenv/config';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PumpfunClone } from '../target/types/pumpfun_clone';
import { BN } from 'bn.js';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
	createInitializeMintInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { bs58 } from 'bs58';

describe('pumpfun-clone', () => {
	// Configure the client to use the local cluster.
	anchor.setProvider(anchor.AnchorProvider.env());

	const program = anchor.workspace.pumpfunClone as Program<PumpfunClone>;

	it('should initialize a mint, bonding curve, and mint a billion tokens to the token_vault!', async () => {
		const mint = Keypair.generate();

		const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
			[Buffer.from('mint_authority'), mint.publicKey.toBuffer()],
			program.programId
		);

		const basePrice = new BN(1_000);
		const initSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(9)));

		const creator = Keypair.fromSecretKey(
			bs58.decode(process.env.WALLET_PRIVATE_KEY)
		);

		const createAccountInstruction = SystemProgram.createAccount({
			fromPubkey: creator.publicKey,
			newAccountPubkey: mint.publicKey,
			space: MINT_SIZE,
			lamports: await getMinimumBalanceForRentExemptMint(
				anchor.AnchorProvider.env().connection
			),
			programId: TOKEN_PROGRAM_ID,
		});

		const initializeMintInstruction = createInitializeMintInstruction(
			mint.publicKey,
			9,
			mintAuthorityPDA,
			null,
			TOKEN_PROGRAM_ID
		);

		const tx = await program.methods
			.initializeToken(basePrice, 300, initSupply)
			.accounts({
				creator: creator.publicKey,
				mint: mint.publicKey,
			})
			.preInstructions([
				createAccountInstruction,
				initializeMintInstruction,
			])
			.signers([creator, mint])
			.rpc();

		console.log('Your transaction signature', tx);
	});
});
