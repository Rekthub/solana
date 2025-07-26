import 'dotenv/config';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Dumpfun } from '../target/types/dumpfun';
import dumpfunIdl from '../target/idl/dumpfun.json';

function test() {
	const connection = new Connection(clusterApiUrl('devnet'));
	const program = new Program<Dumpfun>(dumpfunIdl, {
		connection: connection,
	});

	program.addEventListener('onInitializeEvent', (data) => {
		console.log(data);
	});

	program.addEventListener('onBuyEvent', (data) => {
		console.log(data);
	});

	program.addEventListener('onSellEvent', (data) => {
		console.log(data);
	});
}

test();
