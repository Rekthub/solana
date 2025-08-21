import 'dotenv/config';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Dumpfun } from '../target/types/dumpfun';
import { BN } from 'bn.js';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

describe('dumpfun trading simulation', () => {
	anchor.setProvider(anchor.AnchorProvider.env());
	const program = anchor.workspace.dumpfun as Program<Dumpfun>;

	// Trading amounts
	const buyAmounts = [0.1, 0.2, 0.5];
	const sellPercentages = [10, 25, 50, 75];

	const mints = [
		'D9qjiQMuGGSmXwv84WFwZxPRKfhZaZ9QUmBFZR1MAbfJ',
		'7RhvnPDY2yMyYh2WZkJAUiHecqaDQdU7uwJfU2Q6d3V2',
		'N65Xy63bPuuepM7uoD8vRxN2Ugk5msrgZaHnmR5c4kA',
		'6bqvSx8qFY6hSSjCZxcgbH2oLadX1c6e1D4a79gcjAWG',
		'BjyQctBeuJM67YmDmjX5AnoHp2njFCsEmPGVzo9nkhk',
		'FZQWQBnJ3gK8hjAS9D8UbWGD1iJxKPcdHhVSgwv1iTUC',
		'8wS3Myi1Hdz2ujujecXu2vxW3d6uS3ag99NS2cr7PAKr',
		'CbNC7PBSy56q5tmy9H62XwxMWR9UkFimmogYbSw7fVMy',
		'12X9SK7LNMhmXVWhNa7ERWz4fKnXq7kbq4J2pX5GcPD1',
		'FmQPoJ9ek5uU6NnFKtBoP2W1nAamTKGksaCDF6SN4yi4',
		'J7CMmiPyMrXGqSVGF57x6wYeqpdwEiXR9LpNRZaXqVTd',
		'8CT4SupHUd5jNMCzNcUJhKipmw5DBUak4Kqwz3gzyExG',
	];

	const wallet = Keypair.fromSecretKey(
		bs58.decode(process.env.WALLET_PRIVATE_KEY!)
	);

	// Trading patterns
	const tradingPatterns = {
		scalper: { buyDelay: [100, 500], sellDelay: [200, 800], aggression: 0.8 },
		dayTrader: {
			buyDelay: [500, 2000],
			sellDelay: [1000, 5000],
			aggression: 0.6,
		},
		swingTrader: {
			buyDelay: [1000, 5000],
			sellDelay: [2000, 10000],
			aggression: 0.4,
		},
		holder: {
			buyDelay: [2000, 8000],
			sellDelay: [5000, 15000],
			aggression: 0.2,
		},
	};

	// Utility functions
	const random = (min: number, max: number) =>
		Math.random() * (max - min) + min;
	const randomInt = (min: number, max: number) =>
		Math.floor(random(min, max + 1));
	const getRandomElement = <T>(arr: T[]): T =>
		arr[Math.floor(Math.random() * arr.length)];
	const sleep = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	// Market sentiment simulation
	let marketSentiment = 0.5; // 0 = bearish, 1 = bullish
	const updateMarketSentiment = () => {
		marketSentiment = Math.max(
			0,
			Math.min(1, marketSentiment + (Math.random() - 0.5) * 0.1)
		);
	};

	// Trading bot class
	class TradingBot {
		id: string;
		pattern: keyof typeof tradingPatterns;
		preferredMints: string[];

		constructor(
			id: string,
			pattern: keyof typeof tradingPatterns,
			preferredMints: string[] = []
		) {
			this.id = id;
			this.pattern = pattern;
			this.preferredMints = preferredMints.length > 0 ? preferredMints : mints;
		}

		async executeBuy(mint: string, amount: number): Promise<any> {
			try {
				const mintPubkey = new PublicKey(mint);
				const startTime = Date.now();

				console.log(
					`[${this.id}] 💰 BUY: ${amount} SOL on ${mint.slice(0, 8)}... (${
						this.pattern
					})`
				);

				const tx = await program.methods
					.buy(
						new BN(amount * LAMPORTS_PER_SOL),
						new BN(randomInt(300, 800)) // Dynamic slippage 3-8%
					)
					.accounts({
						mint: mintPubkey,
						buyer: wallet.publicKey,
					})
					.signers([wallet])
					.rpc({ skipPreflight: true });

				const duration = Date.now() - startTime;
				console.log(
					`[${this.id}] ✅ BUY completed in ${duration}ms - TX: ${tx.slice(
						0,
						12
					)}...`
				);
				return { success: true, tx, duration, type: 'buy', amount, mint };
			} catch (error) {
				console.error(`[${this.id}] ❌ BUY failed:`, error.message);
				return {
					success: false,
					error: error.message,
					type: 'buy',
					amount,
					mint,
				};
			}
		}

		async executeSell(mint: string, percentage: number): Promise<any> {
			try {
				const mintPubkey = new PublicKey(mint);
				const startTime = Date.now();

				console.log(
					`[${this.id}] 📉 SELL: ${percentage}% on ${mint.slice(0, 8)}... (${
						this.pattern
					})`
				);

				const tx = await program.methods
					.sell(
						new anchor.BN(percentage * 100),
						true,
						new anchor.BN(randomInt(300, 800)) // Dynamic slippage 3-8%
					)
					.accounts({
						mint: mintPubkey,
						seller: wallet.publicKey,
					})
					.signers([wallet])
					.rpc({ skipPreflight: true });

				const duration = Date.now() - startTime;
				console.log(
					`[${this.id}] ✅ SELL completed in ${duration}ms - TX: ${tx.slice(
						0,
						12
					)}...`
				);
				return { success: true, tx, duration, type: 'sell', percentage, mint };
			} catch (error) {
				console.error(`[${this.id}] ❌ SELL failed:`, error.message);
				return {
					success: false,
					error: error.message,
					type: 'sell',
					percentage,
					mint,
				};
			}
		}

		async performTrade(): Promise<any> {
			const config = tradingPatterns[this.pattern];
			const mint = getRandomElement(this.preferredMints);

			// Decide whether to buy or sell based on market sentiment and bot aggression
			const shouldBuy =
				Math.random() < marketSentiment * config.aggression + 0.3;

			if (shouldBuy) {
				const amount = getRandomElement(buyAmounts);
				const delay = randomInt(config.buyDelay[0], config.buyDelay[1]);
				await sleep(delay);
				return this.executeBuy(mint, amount);
			} else {
				const percentage = getRandomElement(sellPercentages);
				const delay = randomInt(config.sellDelay[0], config.sellDelay[1]);
				await sleep(delay);
				return this.executeSell(mint, percentage);
			}
		}
	}

	// Market maker simulation
	class MarketMaker extends TradingBot {
		constructor(id: string, focusMint: string) {
			super(id, 'scalper', [focusMint]);
		}

		async provideLiquidity(): Promise<any[]> {
			const mint = this.preferredMints[0];
			const operations = [];

			// Simultaneous buy and sell to provide liquidity
			operations.push(
				this.executeBuy(mint, getRandomElement([0.1, 0.15, 0.2])),
				this.executeSell(mint, getRandomElement([15, 20, 25]))
			);

			return Promise.all(operations);
		}
	}

	// Arbitrage bot simulation
	class ArbitrageBot extends TradingBot {
		constructor(id: string) {
			super(id, 'scalper');
		}

		async executeArbitrage(): Promise<any[]> {
			const mint1 = getRandomElement(mints);
			const mint2 = getRandomElement(mints.filter((m) => m !== mint1));
			const amount = getRandomElement([0.1, 0.2]);

			// Simulate arbitrage: buy on one mint, sell on another
			console.log(
				`[${this.id}] 🔄 ARBITRAGE: ${mint1.slice(0, 8)} -> ${mint2.slice(
					0,
					8
				)}`
			);

			const operations = [
				this.executeBuy(mint1, amount),
				this.executeSell(mint2, getRandomElement([25, 50])),
			];

			return Promise.all(operations);
		}
	}

	it('should simulate realistic trading with 50+ concurrent operations', async () => {
		console.log('🎯 Starting realistic trading simulation...');
		console.log(
			`📊 Initial market sentiment: ${(marketSentiment * 100).toFixed(1)}%\n`
		);

		const operations: Promise<any>[] = [];

		// Create diverse trading bots
		const bots = [
			// Scalpers (high frequency)
			...Array.from(
				{ length: 8 },
				(_, i) => new TradingBot(`SCALP-${i}`, 'scalper')
			),
			// Day traders (medium frequency)
			...Array.from(
				{ length: 6 },
				(_, i) => new TradingBot(`DAY-${i}`, 'dayTrader')
			),
			// Swing traders (lower frequency)
			...Array.from(
				{ length: 4 },
				(_, i) => new TradingBot(`SWING-${i}`, 'swingTrader')
			),
			// Holders (occasional trades)
			...Array.from(
				{ length: 3 },
				(_, i) => new TradingBot(`HOLD-${i}`, 'holder')
			),
		];

		// Market makers (provide liquidity)
		const marketMakers = mints
			.slice(0, 3)
			.map((mint, i) => new MarketMaker(`MM-${i}`, mint));

		// Arbitrage bots
		const arbitrageBots = Array.from(
			{ length: 2 },
			(_, i) => new ArbitrageBot(`ARB-${i}`)
		);

		// Execute regular trading
		for (const bot of bots) {
			operations.push(bot.performTrade());
		}

		// Execute market making (simultaneous buy/sell)
		for (const mm of marketMakers) {
			operations.push(...(await mm.provideLiquidity()));
		}

		// Execute arbitrage
		for (const arbBot of arbitrageBots) {
			operations.push(...(await arbBot.executeArbitrage()));
		}

		// Add some random additional trades during execution
		const additionalTrades = 15;
		for (let i = 0; i < additionalTrades; i++) {
			const randomBot = getRandomElement(bots);
			setTimeout(() => {
				operations.push(randomBot.performTrade());
			}, randomInt(1000, 8000));
		}

		// Update market sentiment during trading
		const sentimentUpdater = setInterval(() => {
			updateMarketSentiment();
			console.log(
				`📈 Market sentiment updated: ${(marketSentiment * 100).toFixed(1)}%`
			);
		}, 3000);

		const startTime = Date.now();
		console.log(
			`🚀 Executing ${operations.length}+ concurrent operations...\n`
		);

		const results = await Promise.allSettled(operations);
		clearInterval(sentimentUpdater);

		const totalTime = Date.now() - startTime;

		// Analyze results
		const successful = results.filter(
			(r) =>
				r.status === 'fulfilled' &&
				(Array.isArray(r.value)
					? r.value.every((v) => v.success)
					: r.value.success)
		).length;
		const failed = results.length - successful;

		const buyOps = results.filter(
			(r) =>
				r.status === 'fulfilled' &&
				(Array.isArray(r.value)
					? r.value.some((v) => v.type === 'buy')
					: r.value.type === 'buy')
		).length;
		const sellOps = results.filter(
			(r) =>
				r.status === 'fulfilled' &&
				(Array.isArray(r.value)
					? r.value.some((v) => v.type === 'sell')
					: r.value.type === 'sell')
		).length;

		console.log('\n' + '='.repeat(60));
		console.log('📊 TRADING SIMULATION RESULTS');
		console.log('='.repeat(60));
		console.log(`Total operations executed: ${results.length}`);
		console.log(`Buy operations: ${buyOps}`);
		console.log(`Sell operations: ${sellOps}`);
		console.log(`Successful operations: ${successful}`);
		console.log(`Failed operations: ${failed}`);
		console.log(
			`Success rate: ${((successful / results.length) * 100).toFixed(2)}%`
		);
		console.log(`Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
		console.log(
			`Average time per operation: ${(totalTime / results.length).toFixed(2)}ms`
		);
		console.log(
			`Operations per second: ${(results.length / (totalTime / 1000)).toFixed(
				2
			)}`
		);
		console.log(
			`Final market sentiment: ${(marketSentiment * 100).toFixed(1)}%`
		);
		console.log('='.repeat(60));
	});

	it('should simulate high-frequency trading burst', async () => {
		console.log('⚡ Starting high-frequency trading burst simulation...');

		const operations: Promise<any>[] = [];

		// Create aggressive HFT bots
		const hftBots = Array.from(
			{ length: 12 },
			(_, i) => new TradingBot(`HFT-${i}`, 'scalper')
		);

		// Rapid-fire trading with minimal delays
		for (let round = 0; round < 3; round++) {
			console.log(`🔄 Starting trading round ${round + 1}...`);

			for (const bot of hftBots) {
				// Each bot performs 2-3 rapid trades
				const tradesPerBot = randomInt(2, 4);
				for (let i = 0; i < tradesPerBot; i++) {
					setTimeout(() => {
						operations.push(bot.performTrade());
					}, randomInt(50, 300) * (round + 1));
				}
			}

			await sleep(2000); // Brief pause between rounds
		}

		const startTime = Date.now();
		const results = await Promise.allSettled(operations);
		const totalTime = Date.now() - startTime;

		const successful = results.filter(
			(r) => r.status === 'fulfilled' && r.value.success
		).length;
		const failed = results.length - successful;

		console.log('\n' + '='.repeat(60));
		console.log('⚡ HIGH-FREQUENCY TRADING RESULTS');
		console.log('='.repeat(60));
		console.log(`Total HFT operations: ${results.length}`);
		console.log(`Successful: ${successful}`);
		console.log(`Failed: ${failed}`);
		console.log(
			`Success rate: ${((successful / results.length) * 100).toFixed(2)}%`
		);
		console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
		console.log(
			`Peak TPS: ${(results.length / (totalTime / 1000)).toFixed(2)}`
		);
		console.log('='.repeat(60));
	});

	it('should simulate coordinated trading event (flash crash/pump)', async () => {
		console.log('📈💥 Simulating coordinated trading event...');

		const targetMint = getRandomElement(mints);
		const operations: Promise<any>[] = [];

		console.log(`🎯 Target mint for event: ${targetMint.slice(0, 8)}...`);

		// Phase 1: Coordinated buying (pump)
		console.log('📈 Phase 1: Coordinated buying...');
		const pumpBots = Array.from(
			{ length: 15 },
			(_, i) => new TradingBot(`PUMP-${i}`, 'scalper', [targetMint])
		);

		for (const bot of pumpBots) {
			setTimeout(() => {
				const amount = getRandomElement([0.2, 0.5]);
				operations.push(bot.executeBuy(targetMint, amount));
			}, randomInt(0, 1000));
		}

		await sleep(3000);

		// Phase 2: Coordinated selling (dump)
		console.log('📉 Phase 2: Coordinated selling...');
		const dumpBots = Array.from(
			{ length: 12 },
			(_, i) => new TradingBot(`DUMP-${i}`, 'scalper', [targetMint])
		);

		for (const bot of dumpBots) {
			setTimeout(() => {
				const percentage = getRandomElement([50, 75, 100]);
				operations.push(bot.executeSell(targetMint, percentage));
			}, randomInt(0, 800));
		}

		// Phase 3: Opportunistic trading (others react)
		console.log('🎯 Phase 3: Market reaction...');
		const reactionBots = Array.from(
			{ length: 8 },
			(_, i) => new TradingBot(`REACT-${i}`, 'dayTrader')
		);

		for (const bot of reactionBots) {
			setTimeout(() => {
				operations.push(bot.performTrade());
			}, randomInt(2000, 4000));
		}

		const startTime = Date.now();
		const results = await Promise.allSettled(operations);
		const totalTime = Date.now() - startTime;

		const successful = results.filter(
			(r) => r.status === 'fulfilled' && r.value.success
		).length;
		const failed = results.length - successful;

		console.log('\n' + '='.repeat(60));
		console.log('💥 COORDINATED EVENT RESULTS');
		console.log('='.repeat(60));
		console.log(`Event target: ${targetMint.slice(0, 20)}...`);
		console.log(`Total operations: ${results.length}`);
		console.log(`Successful: ${successful}`);
		console.log(`Failed: ${failed}`);
		console.log(
			`Success rate: ${((successful / results.length) * 100).toFixed(2)}%`
		);
		console.log(`Event duration: ${(totalTime / 1000).toFixed(2)}s`);
		console.log('='.repeat(60));
	});

	it.skip('should simulate extreme market stress (100+ operations)', async () => {
		console.log('🚨 EXTREME MARKET STRESS TEST - 100+ Operations');
		console.log('⚠️  This will push your system to the limit!');

		const operations: Promise<any>[] = [];

		// Create massive bot army
		const extremeBots = [
			...Array.from(
				{ length: 25 },
				(_, i) => new TradingBot(`EX-SCALP-${i}`, 'scalper')
			),
			...Array.from(
				{ length: 15 },
				(_, i) => new TradingBot(`EX-DAY-${i}`, 'dayTrader')
			),
			...Array.from(
				{ length: 10 },
				(_, i) => new TradingBot(`EX-SWING-${i}`, 'swingTrader')
			),
		];

		// Market makers for each mint
		const extremeMMs = mints.map(
			(mint, i) => new MarketMaker(`EX-MM-${i}`, mint)
		);

		// Arbitrage army
		const extremeArbs = Array.from(
			{ length: 5 },
			(_, i) => new ArbitrageBot(`EX-ARB-${i}`)
		);

		// Execute all operations with staggered timing
		for (const bot of extremeBots) {
			setTimeout(() => {
				operations.push(bot.performTrade());
				// Each bot does 2-3 additional trades
				setTimeout(
					() => operations.push(bot.performTrade()),
					randomInt(1000, 3000)
				);
				setTimeout(
					() => operations.push(bot.performTrade()),
					randomInt(2000, 5000)
				);
			}, randomInt(0, 2000));
		}

		// Market makers provide continuous liquidity
		for (const mm of extremeMMs) {
			setTimeout(async () => {
				operations.push(...(await mm.provideLiquidity()));
				// Additional liquidity rounds
				setTimeout(
					async () => operations.push(...(await mm.provideLiquidity())),
					2000
				);
				setTimeout(
					async () => operations.push(...(await mm.provideLiquidity())),
					4000
				);
			}, randomInt(0, 1000));
		}

		// Arbitrage opportunities
		for (const arb of extremeArbs) {
			setTimeout(async () => {
				operations.push(...(await arb.executeArbitrage()));
				setTimeout(
					async () => operations.push(...(await arb.executeArbitrage())),
					3000
				);
			}, randomInt(0, 1500));
		}

		console.log('⏳ Warming up systems...');
		await sleep(3000);

		console.log(`🚀 Launching ${operations.length}+ extreme operations...`);
		const startTime = Date.now();

		const results = await Promise.allSettled(operations);
		const totalTime = Date.now() - startTime;

		const successful = results.filter(
			(r) =>
				r.status === 'fulfilled' &&
				(Array.isArray(r.value)
					? r.value.every((v) => v.success)
					: r.value.success)
		).length;
		const failed = results.length - successful;

		console.log('\n' + '🚨'.repeat(20));
		console.log('EXTREME STRESS TEST RESULTS');
		console.log('🚨'.repeat(20));
		console.log(`Total operations: ${results.length}`);
		console.log(`Successful: ${successful}`);
		console.log(`Failed: ${failed}`);
		console.log(
			`Success rate: ${((successful / results.length) * 100).toFixed(2)}%`
		);
		console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
		console.log(
			`Peak TPS: ${(results.length / (totalTime / 1000)).toFixed(2)}`
		);
		console.log(`System survived: ${successful > 0 ? '✅ YES' : '❌ NO'}`);
		console.log('🚨'.repeat(20));
	});
});
