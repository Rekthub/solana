import 'dotenv/config';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Dumpfun } from '../target/types/dumpfun';
import { BN } from 'bn.js';
import {
	ComputeBudgetProgram,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
} from '@solana/web3.js';
import {
	createInitializeMintInstruction,
	getAssociatedTokenAddressSync,
	getMinimumBalanceForRentExemptMint,
	MINT_SIZE,
	NATIVE_MINT,
	TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

describe('rekthub', () => {
	anchor.setProvider(anchor.AnchorProvider.env());

	const program = anchor.workspace.dumpfun as Program<Dumpfun>;
	const mint = Keypair.generate();
	const creator = Keypair.fromSecretKey(
		bs58.decode(process.env.WALLET_PRIVATE_KEY)
	);

	it('should initialize mint and bonding curve', async () => {
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
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.preInstructions([createAccountInstruction, initializeMintInstruction])
			.signers([creator, mint])
			.rpc({ skipPreflight: false });

		console.log('Initialize transaction:', tx);
	});

	it('should buy tokens from bonding curve', async () => {
		const tx = await program.methods
			.buy(new BN(5 * LAMPORTS_PER_SOL), new BN(50))
			.accounts({
				mint: mint.publicKey,
				buyer: creator.publicKey,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([creator])
			.rpc({ skipPreflight: false });

		console.log('Buy transaction:', tx);
	});

	it('should sell 100% of tokens to bonding curve', async () => {
		const tx = await program.methods
			.sell(new BN(10_000), true, new BN(50))
			.accounts({
				mint: mint.publicKey,
				seller: creator.publicKey,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([creator])
			.rpc({ skipPreflight: true });

		console.log('Sell transaction:', tx);
	});

	it('should prepare bonding curve for migration', async () => {
		const tx = await program.methods
			.prepareCurveMigration()
			.accounts({
				signer: creator.publicKey,
				mint: mint.publicKey,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([creator])
			.rpc({ skipPreflight: true });

		console.log('Migration preparation transaction:', tx);
	});

	it('should initialize Raydium pool with migration authority funds', async () => {
		function u16ToBytes(num: number) {
			const arr = new ArrayBuffer(2);
			const view = new DataView(arr);
			view.setUint16(0, num, true);
			return new Uint8Array(arr);
		}

		const [ammConfig] = await PublicKey.findProgramAddress(
			[Buffer.from('amm_config'), u16ToBytes(0)],
			new PublicKey('DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb')
		);

		const [pool] = await PublicKey.findProgramAddress(
			[
				Buffer.from('pool'),
				ammConfig.toBuffer(),
				NATIVE_MINT.toBuffer(),
				mint.publicKey.toBuffer(),
			],
			new PublicKey('DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb')
		);

		const [lpMintAddress] = await PublicKey.findProgramAddress(
			[Buffer.from('pool_lp_mint'), pool.toBuffer()],
			new PublicKey('DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb')
		);

		const creatorLpToken = getAssociatedTokenAddressSync(
			lpMintAddress,
			PublicKey.findProgramAddressSync(
				[Buffer.from('migration_authority'), mint.publicKey.toBuffer()],
				program.programId
			)[0],
			true,
			TOKEN_PROGRAM_ID
		);

		const tx = await program.methods
			.initializeRaydiumPool()
			.accounts({
				signer: creator.publicKey,
				mint0: NATIVE_MINT,
				mint1: mint.publicKey,
				mint0Program: TOKEN_PROGRAM_ID,
				mint1Program: TOKEN_PROGRAM_ID,
				lpMint: lpMintAddress,
				creatorLpToken,
			})
			.signers([creator])
			.preInstructions([
				ComputeBudgetProgram.setComputeUnitLimit({
					units: 400_000,
				}),
			])
			.rpc({ skipPreflight: true });

		console.log('Raydium pool initialization transaction:', tx);
	});
});
