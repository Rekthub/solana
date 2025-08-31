import 'dotenv/config';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Dumpfun } from '../target/types/dumpfun';
import { BN } from 'bn.js';
import {
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
} from '@solana/web3.js';
import {
	createInitializeMintInstruction,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

describe('dumpfun', () => {
	// Configure the client to use the local cluster.
	anchor.setProvider(anchor.AnchorProvider.env());

	const program = anchor.workspace.dumpfun as Program<Dumpfun>;

	const mint = Keypair.generate();

	const creator = Keypair.fromSecretKey(
		bs58.decode(process.env.WALLET_PRIVATE_KEY)
	);

	it('should initialize a mint, bonding curve, and mint a billion tokens to the token_vault!', async () => {
		const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
			[Buffer.from('mint_authority')],
			program.programId
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
			6,
			mintAuthorityPDA,
			null,
			TOKEN_PROGRAM_ID
		);

		const tx = await program.methods
			.initialize(
				'Solana Gold',
				'GOLDSOL',
				'https://53cso10vyy.ufs.sh/f/0zLYHmgdOsEGYF3WHmI7jv08b2BZmzpuEFaAiQNHXKsgrPTD'
			)
			.accounts({
				creator: creator.publicKey,
				mint: mint.publicKey,
				tokenMetadataProgram: new PublicKey(
					'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
				),
			})
			.preInstructions([createAccountInstruction, initializeMintInstruction])
			.signers([creator, mint])
			.rpc({ skipPreflight: true });

		console.log('token creation transaction signature', tx);
	});

	it('should buy 1 sol worth of tokens from the bonding curve', async () => {
		const tx = await program.methods
			.buy(
				new BN(1 * LAMPORTS_PER_SOL), // amount converted to lamports
				new BN(50) // 0.5% slippage
			)
			.accounts({
				mint: mint.publicKey,
				buyer: creator.publicKey,
			})
			.signers([creator])
			.rpc({ skipPreflight: true });

		console.log('token purchase transaction signature', tx);
	});

	it('should sell 100% worth of tokens to the bonding curve', async () => {
		const tx = await program.methods
			.sell(
				new anchor.BN(10_000), // 10_000 basis points = 100%
				true, // is amount supplied in percentage
				new anchor.BN(50) // 0.5% slippage
			)
			.accounts({
				mint: mint.publicKey,
				seller: creator.publicKey,
			})
			.signers([creator])
			.rpc({ skipPreflight: true });

		console.log('token sale transaction signature', tx);
	});
});
