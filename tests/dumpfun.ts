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

	// const mint = Keypair.generate();

	// it('should initialize a mint, bonding curve, and mint a billion tokens to the token_vault!', async () => {
	// 	const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
	// 		[Buffer.from('mint_authority')],
	// 		program.programId
	// 	);

	// 	const creator = Keypair.fromSecretKey(
	// 		bs58.decode(process.env.WALLET_PRIVATE_KEY)
	// 	);

	// 	const createAccountInstruction = SystemProgram.createAccount({
	// 		fromPubkey: creator.publicKey,
	// 		newAccountPubkey: mint.publicKey,
	// 		space: MINT_SIZE,
	// 		lamports: await getMinimumBalanceForRentExemptMint(
	// 			anchor.AnchorProvider.env().connection
	// 		),
	// 		programId: TOKEN_PROGRAM_ID,
	// 	});

	// 	const initializeMintInstruction = createInitializeMintInstruction(
	// 		mint.publicKey,
	// 		6,
	// 		mintAuthorityPDA,
	// 		null,
	// 		TOKEN_PROGRAM_ID
	// 	);

	// 	const tx = await program.methods
	// 		.initialize(
	// 			'Solana Gold',
	// 			'GOLDSOL',
	// 			'https://53cso10vyy.ufs.sh/f/0zLYHmgdOsEGYF3WHmI7jv08b2BZmzpuEFaAiQNHXKsgrPTD'
	// 		)
	// 		.accounts({
	// 			creator: creator.publicKey,
	// 			mint: mint.publicKey,
	// 			tokenMetadataProgram: new PublicKey(
	// 				'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
	// 			),
	// 		})
	// 		.preInstructions([
	// 			createAccountInstruction,
	// 			initializeMintInstruction,
	// 		])
	// 		.signers([creator, mint])
	// 		.rpc({ skipPreflight: true });

	// 	console.log('Your transaction signature', tx);
	// });
	const datum = [
		{ mint: 'CbNC7PBSy56q5tmy9H62XwxMWR9UkFimmogYbSw7fVMy', amount: 20.3379 },
		{ mint: 'FmQPoJ9ek5uU6NnFKtBoP2W1nAamTKGksaCDF6SN4yi4', amount: 10.4818 },
		{ mint: 'BjyQctBeuJM67YmDmjX5AnoHp2njFCsEmPGVzo9nkhk', amount: 3.957 },
		{ mint: 'D9qjiQMuGGSmXwv84WFwZxPRKfhZaZ9QUmBFZR1MAbfJ', amount: 25.675 },
		{ mint: '7RhvnPDY2yMyYh2WZkJAUiHecqaDQdU7uwJfU2Q6d3V2', amount: 6.8717 },
		{ mint: 'FZQWQBnJ3gK8hjAS9D8UbWGD1iJxKPcdHhVSgwv1iTUC', amount: 40.3654 },
		{ mint: '8wS3Myi1Hdz2ujujecXu2vxW3d6uS3ag99NS2cr7PAKr', amount: 2.1332 },
		{ mint: 'N65Xy63bPuuepM7uoD8vRxN2Ugk5msrgZaHnmR5c4kA', amount: 12.2257 },
		{ mint: 'J7CMmiPyMrXGqSVGF57x6wYeqpdwEiXR9LpNRZaXqVTd', amount: 6.149 },
	];

	// it('should buy 1 sol worth of tokens from the bonding curve', async () => {
	// 	for (const data of datum) {
	// 		const mint = new PublicKey(data.mint);
	// 		const buyer = Keypair.fromSecretKey(
	// 			bs58.decode(process.env.WALLET_PRIVATE_KEY)
	// 		);

	// 		const tx = await program.methods
	// 			.buy(new BN(data.amount * LAMPORTS_PER_SOL), new BN(500))
	// 			.accounts({
	// 				mint: mint,
	// 				buyer: buyer.publicKey,
	// 			})
	// 			.signers([buyer])
	// 			.rpc({ skipPreflight: true });

	// 		console.log('Your transaction signature', tx);
	// 	}
	// });

	it('should sell 100% worth of tokens to the bonding curve', async () => {
		for (const data of datum) {
			const mint = new PublicKey(data.mint);
			const seller = Keypair.fromSecretKey(
				bs58.decode(process.env.WALLET_PRIVATE_KEY)
			);

			const tx = await program.methods
				.sell(
					new anchor.BN(10000), // 5000 basis points = 50%
					true,
					new anchor.BN(300) // 3% slippage
				)
				.accounts({
					mint: mint,
					seller: seller.publicKey,
				})
				.signers([seller])
				.rpc({ skipPreflight: true });

			console.log('Your transaction signature', tx);
		}
	});
});
