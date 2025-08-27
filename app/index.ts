import 'dotenv/config';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Dumpfun } from '../target/types/dumpfun';
import { BN } from 'bn.js';
import {
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
} from '@solana/web3.js';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import idl from '../target/idl/dumpfun.json';

// Configuration interfaces
interface TradingConfig {
	tradeCooldownMs: number;
	batchIntervalMs: number;
	totalRounds: number;
	marketMakerFrequency: number;
	positionCapPerBot: number;
	maxDrawdownPct: number;
	recoveryPct: number;
}

interface TradingPersona {
	name: string;
	buyBias: number;
	sizePreference: string[];
	riskTolerance: number;
	reactionSpeed: number;
	description: string;
}

interface MarketRegime {
	type: 'RALLY' | 'EUPHORIA' | 'CHOP' | 'PULLBACK';
	duration: number;
	intensityMultiplier: number;
	sentimentThreshold: number;
}

interface BotState {
	netPosition: number;
	estimatedPnL: number;
	avgEntryPrice: number;
	consecutiveWins: number;
	consecutiveLosses: number;
	lastActionTime: number;
	cooldownMultiplier: number;
	totalVolume: number;
	peakPnL: number;
}

interface NewsEvent {
	type: 'BULLISH' | 'BEARISH';
	sentimentImpact: number;
	duration: number;
	description: string;
}

// Persona definitions
const TRADING_PERSONAS: TradingPersona[] = [
	{
		name: 'retail_accumulator',
		buyBias: 0.75,
		sizePreference: ['small', 'small', 'medium'],
		riskTolerance: 0.6,
		reactionSpeed: 1.2,
		description: 'Patient retail investor, DCA strategy',
	},
	{
		name: 'momentum_chaser',
		buyBias: 0.6,
		sizePreference: ['medium', 'medium', 'large'],
		riskTolerance: 0.8,
		reactionSpeed: 0.7,
		description: 'Fast-moving momentum trader',
	},
	{
		name: 'whale_accumulator',
		buyBias: 0.8,
		sizePreference: ['large', 'large', 'massive'],
		riskTolerance: 0.9,
		reactionSpeed: 1.8,
		description: 'Deep-pockets accumulator, patient whale',
	},
	{
		name: 'mean_reverter',
		buyBias: 0.4,
		sizePreference: ['small', 'medium', 'medium'],
		riskTolerance: 0.5,
		reactionSpeed: 1.5,
		description: 'Contrarian trader, buys dips',
	},
	{
		name: 'scalper',
		buyBias: 0.55,
		sizePreference: ['small', 'small', 'small'],
		riskTolerance: 0.4,
		reactionSpeed: 0.5,
		description: 'Quick in/out, high frequency',
	},
	{
		name: 'degen_aper',
		buyBias: 0.85,
		sizePreference: ['medium', 'large', 'massive'],
		riskTolerance: 1.0,
		reactionSpeed: 0.3,
		description: 'FOMO-driven, size up on strength',
	},
];

class EnhancedBullishTradingSimulator {
	private rpcUrls = [
		'https://devnet.helius-rpc.com/?api-key=db60d95e-c458-4a87-863e-afdc0205c358',
		'https://devnet.helius-rpc.com/?api-key=f7574809-5849-4160-8779-4b1dc0f724d6',
		'https://devnet.helius-rpc.com/?api-key=7de73fc4-861a-4bf7-99df-c20250b7f094',
		'https://devnet.helius-rpc.com/?api-key=81d02e4b-7b74-424f-ad6b-46873393441a',
		'https://devnet.helius-rpc.com/?api-key=ab7556ed-3296-41ac-85cb-e3c0ee4ee815',
		'https://devnet.helius-rpc.com/?api-key=e51aba7a-381a-4dd2-8cfd-b5255b8e2163',
		'https://devnet.helius-rpc.com/?api-key=a461e1fc-3188-426e-80bf-e34492187c49',
		'https://devnet.helius-rpc.com/?api-key=9c2b5fc9-6612-4d83-8642-acfdae6b055b',
		'https://devnet.helius-rpc.com/?api-key=c591cec1-db80-4910-b800-4be20ca7ae33',
	];

	private currentRpcIndex = 0;
	private connectionPool: Connection[] = [];
	private programPool: Program<Dumpfun>[] = [];
	private wallet: Keypair;
	private marketSentiment = 0.6;
	private sentimentTrend = 0.02;
	private sentimentHistory: number[] = [];
	private globalNewsEvent: NewsEvent | null = null;
	private globalActionQueue: Promise<any> = Promise.resolve();

	private buyAmounts = {
		small: [0.05, 0.08, 0.12, 0.15],
		medium: [0.2, 0.25, 0.3, 0.35, 0.4],
		large: [0.5, 0.6, 0.7, 0.8, 1.0],
		massive: [1.5, 2.0, 2.5, 3.0],
	};

	private sellPercentages = {
		tiny: [5, 8, 10, 12, 15],
		small: [15, 20, 25, 30],
		medium: [35, 50, 70, 90],
	};

	private mints: string[] = [];

	constructor(mint: string) {
		this.mints.push(mint);
		this.wallet = Keypair.fromSecretKey(
			bs58.decode(process.env.WALLET_PRIVATE_KEY!)
		);
	}

	// Getter methods
	getMints() {
		return this.mints;
	}
	getBuyAmounts() {
		return this.buyAmounts;
	}
	getSellPercentages() {
		return this.sellPercentages;
	}
	getWallet() {
		return this.wallet;
	}
	getMarketSentiment() {
		return this.marketSentiment;
	}
	getSentimentTrend() {
		return this.sentimentTrend;
	}

	private initializeRpcPools() {
		const providerWallet = new anchor.Wallet(this.wallet);
		this.connectionPool = this.rpcUrls.map(
			(url) => new Connection(url, 'confirmed')
		);

		this.programPool = this.connectionPool.map((connection) => {
			const provider = new anchor.AnchorProvider(connection, providerWallet, {
				commitment: 'confirmed',
			});
			return new Program<Dumpfun>(idl, provider);
		});
		console.log(`🌐 Initialized ${this.rpcUrls.length} RPC connections`);
	}

	getNextProgram(): Program<Dumpfun> {
		const program = this.programPool[this.currentRpcIndex];
		this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
		return program;
	}

	getRandomProgram(): Program<Dumpfun> {
		const randomIndex = Math.floor(Math.random() * this.programPool.length);
		return this.programPool[randomIndex];
	}

	private async checkRpcHealth(): Promise<void> {
		console.log('🏥 Checking RPC endpoint health...');
		const healthChecks = this.connectionPool.map(async (connection, index) => {
			try {
				const startTime = Date.now();
				await connection.getLatestBlockhash();
				const latency = Date.now() - startTime;
				console.log(
					`✅ RPC ${index + 1}: ${latency}ms - ${
						this.rpcUrls[index].split('/')[2]
					}`
				);
				return { index, healthy: true, latency };
			} catch (error) {
				console.log(
					`❌ RPC ${index + 1}: Failed - ${this.rpcUrls[index].split('/')[2]}`
				);
				return { index, healthy: false, latency: Infinity };
			}
		});

		const results = await Promise.allSettled(healthChecks);
		const healthyCount = results.filter(
			(r) => r.status === 'fulfilled' && r.value.healthy
		).length;
		console.log(
			`🌐 RPC Health: ${healthyCount}/${this.rpcUrls.length} endpoints healthy\n`
		);
	}

	randomInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	getRandomElement<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	updateMarketSentiment() {
		const prevSentiment = this.marketSentiment;

		// Apply news event impact
		let newsImpact = 0;
		if (this.globalNewsEvent) {
			newsImpact = this.globalNewsEvent.sentimentImpact;
			this.globalNewsEvent.duration--;
			if (this.globalNewsEvent.duration <= 0) {
				console.log(
					`📰 News event concluded: ${this.globalNewsEvent.description}`
				);
				this.globalNewsEvent = null;
			}
		}

		// Natural sentiment evolution with trend
		const randomWalk = (Math.random() - 0.5) * 0.08;
		const trendComponent = this.sentimentTrend;
		const newsComponent = newsImpact;

		this.marketSentiment = Math.max(
			0.3,
			Math.min(
				0.95,
				this.marketSentiment + trendComponent + randomWalk + newsComponent
			)
		);

		// Update sentiment trend occasionally
		if (Math.random() < 0.15) {
			this.sentimentTrend = Math.max(
				-0.04,
				Math.min(0.06, this.sentimentTrend + (Math.random() - 0.5) * 0.02)
			);
		}

		// Track sentiment history
		this.sentimentHistory.push(this.marketSentiment);
		if (this.sentimentHistory.length > 10) {
			this.sentimentHistory = this.sentimentHistory.slice(-10);
		}

		// Calculate actual trend from history
		if (this.sentimentHistory.length >= 3) {
			const recent = this.sentimentHistory.slice(-3);
			this.sentimentTrend =
				(recent[recent.length - 1] - recent[0]) / recent.length;
		}

		console.log(
			`📈 Sentiment: ${(this.marketSentiment * 100).toFixed(1)}% | Trend: ${(
				this.sentimentTrend * 100
			).toFixed(1)}% | ${this.globalNewsEvent ? '📰' : '💭'}`
		);
	}

	private triggerNewsEvent(): NewsEvent | null {
		if (Math.random() < 0.08) {
			// 8% chance per action
			const events = [
				{
					type: 'BULLISH' as const,
					sentimentImpact: 0.08,
					description: 'Whale accumulation spotted',
				},
				{
					type: 'BULLISH' as const,
					sentimentImpact: 0.12,
					description: 'Partnership rumors surface',
				},
				{
					type: 'BULLISH' as const,
					sentimentImpact: 0.06,
					description: 'Technical breakout pattern',
				},
				{
					type: 'BEARISH' as const,
					sentimentImpact: -0.05,
					description: 'Market correction fears',
				},
				{
					type: 'BEARISH' as const,
					sentimentImpact: -0.08,
					description: 'Profit taking detected',
				},
			];

			const event = this.getRandomElement(events);
			return {
				...event,
				duration: this.randomInt(3, 7),
			};
		}
		return null;
	}

	async initialize() {
		this.initializeRpcPools();
		await this.checkRpcHealth();
	}

	async runEnhancedSimulation(config: TradingConfig) {
		console.log('🧠 ENHANCED HUMAN-LIKE TRADING SIMULATION');
		console.log(
			`⚙️  Enhanced Config: Position cap: ${config.positionCapPerBot} SOL, Max DD: ${config.maxDrawdownPct}%`
		);
		console.log(`🎭 ${TRADING_PERSONAS.length} unique personas active\n`);

		// Create enhanced bots with different personas
		const enhancedBots = [
			new EnhancedBullishTradingBot(
				this,
				'RETAIL-1',
				TRADING_PERSONAS[0],
				[],
				'rotation'
			),
			new EnhancedBullishTradingBot(
				this,
				'MOMENTUM-1',
				TRADING_PERSONAS[1],
				[],
				'random'
			),
			new EnhancedBullishTradingBot(
				this,
				'WHALE-1',
				TRADING_PERSONAS[2],
				[],
				'rotation'
			),
			new EnhancedBullishTradingBot(
				this,
				'REVERTER-1',
				TRADING_PERSONAS[3],
				[],
				'random'
			),
			new EnhancedBullishTradingBot(
				this,
				'SCALP-1',
				TRADING_PERSONAS[4],
				[],
				'rotation'
			),
			new EnhancedBullishTradingBot(
				this,
				'DEGEN-1',
				TRADING_PERSONAS[5],
				[],
				'random'
			),
			new EnhancedBullishTradingBot(
				this,
				'RETAIL-2',
				TRADING_PERSONAS[0],
				[],
				'random'
			),
			new EnhancedBullishTradingBot(
				this,
				'MOMENTUM-2',
				TRADING_PERSONAS[1],
				[],
				'rotation'
			),
			new EnhancedBullishTradingBot(
				this,
				'WHALE-2',
				TRADING_PERSONAS[2],
				[],
				'random'
			),
		];

		const marketMakers = this.mints.map(
			(mint, i) => new EnhancedMarketMaker(this, `MM-${i}`, mint)
		);

		let totalOperations: any[] = [];
		let actionsSinceBreak = 0;

		console.log(
			`🚀 Starting ${config.totalRounds} rounds of enhanced trading...\n`
		);

		for (let round = 1; round <= config.totalRounds; round++) {
			console.log(`\n🎯 === ROUND ${round}/${config.totalRounds} ===`);

			// Trigger random news events
			if (!this.globalNewsEvent) {
				const newEvent = this.triggerNewsEvent();
				if (newEvent) {
					this.globalNewsEvent = newEvent;
					console.log(`📰 NEWS: ${newEvent.description} (${newEvent.type})`);
				}
			}

			// Update market sentiment
			this.updateMarketSentiment();

			// Execute bot actions with natural timing
			for (const bot of enhancedBots) {
				const result = await bot.executeEnhancedTrade();
				totalOperations.push(result);
				actionsSinceBreak++;

				// Natural break after 4-7 actions
				if (actionsSinceBreak >= this.randomInt(4, 7)) {
					const breakDuration = this.randomInt(
						Math.floor(config.batchIntervalMs * 1.2),
						Math.floor(config.batchIntervalMs * 3)
					);
					if (breakDuration > 0) {
						console.log(`☕ Natural break: ${breakDuration}ms`);
						await this.sleep(breakDuration);
					}
					actionsSinceBreak = 0;
				}
			}

			// Market makers provide liquidity
			if (round % config.marketMakerFrequency === 0) {
				console.log('💧 Market makers providing liquidity...');
				for (const mm of marketMakers) {
					const results = await mm.provideBullishLiquidity();
					totalOperations.push(...results);
				}
			}

			// Round summary
			const recentOps = totalOperations.slice(-enhancedBots.length);
			const roundSuccess = recentOps.filter((op) => op && op.success).length;
			const roundFailed = recentOps.length - roundSuccess;

			console.log(
				`Round ${round}: ✅ ${roundSuccess} success, ❌ ${roundFailed} failed`
			);

			// Add inter-round pause with jitter
			if (round < config.totalRounds) {
				const pauseTime = Math.max(
					0,
					config.batchIntervalMs + this.randomInt(-200, 500)
				);
				if (pauseTime > 0) {
					await this.sleep(pauseTime);
				}
			}
		}

		// Final statistics
		this.printFinalResults(totalOperations, enhancedBots, config);
	}

	private printFinalResults(
		operations: any[],
		bots: EnhancedBullishTradingBot[],
		config: TradingConfig
	) {
		const totalSuccessful = operations.filter((op) => op && op.success).length;
		const totalFailed = operations.length - totalSuccessful;
		const successRate = (totalSuccessful / operations.length) * 100;

		console.log('\n' + '🧠'.repeat(25));
		console.log('ENHANCED HUMAN-LIKE TRADING RESULTS');
		console.log('🧠'.repeat(25));
		console.log(`Total rounds: ${config.totalRounds}`);
		console.log(`Total operations: ${operations.length}`);
		console.log(`Success rate: ${successRate.toFixed(1)}%`);
		console.log(`Final sentiment: ${(this.marketSentiment * 100).toFixed(1)}%`);

		console.log('\n🎭 PERSONA PERFORMANCE:');
		bots.forEach((bot) => {
			const state = bot.getState();
			console.log(
				`[${bot.id}] ${bot.persona.name} | ` +
					`Net: ${state.netPosition.toFixed(2)} SOL | ` +
					`PnL: ${state.estimatedPnL.toFixed(2)} | ` +
					`Vol: ${state.totalVolume.toFixed(1)} | ` +
					`Actions: ${bot.actionCount}`
			);
		});

		// Calculate aggregate metrics
		const totalNetPosition = bots.reduce(
			(sum, bot) => sum + bot.getState().netPosition,
			0
		);
		const totalEstimatedPnL = bots.reduce(
			(sum, bot) => sum + bot.getState().estimatedPnL,
			0
		);
		const totalVolume = bots.reduce(
			(sum, bot) => sum + bot.getState().totalVolume,
			0
		);

		console.log('\n📊 AGGREGATE METRICS:');
		console.log(`Total net position: ${totalNetPosition.toFixed(2)} SOL`);
		console.log(`Total estimated PnL: ${totalEstimatedPnL.toFixed(2)} SOL`);
		console.log(`Total volume traded: ${totalVolume.toFixed(1)} SOL`);
		console.log(
			`Average position per bot: ${(totalNetPosition / bots.length).toFixed(
				2
			)} SOL`
		);

		console.log('\n🎯 Enhanced simulation completed!');
	}
}

class EnhancedBullishTradingBot {
	id: string;
	persona: TradingPersona;
	preferredMints: string[];
	rpcStrategy: 'rotation' | 'random';
	actionCount: number;
	simulator: EnhancedBullishTradingSimulator;
	private state: BotState;
	private currentRegime: MarketRegime | null = null;
	private recentActions: string[] = [];

	constructor(
		simulator: EnhancedBullishTradingSimulator,
		id: string,
		persona: TradingPersona,
		preferredMints: string[] = [],
		rpcStrategy: 'rotation' | 'random' = 'random'
	) {
		this.simulator = simulator;
		this.id = id;
		this.persona = persona;
		this.preferredMints =
			preferredMints.length > 0 ? preferredMints : simulator.getMints();
		this.rpcStrategy = rpcStrategy;
		this.actionCount = 0;
		this.state = {
			netPosition: 0,
			estimatedPnL: 0,
			avgEntryPrice: 0,
			consecutiveWins: 0,
			consecutiveLosses: 0,
			lastActionTime: 0,
			cooldownMultiplier: 1.0,
			totalVolume: 0,
			peakPnL: 0,
		};
	}

	getState(): BotState {
		return { ...this.state };
	}

	private determineMarketRegime(
		sentiment: number,
		sentimentTrend: number
	): MarketRegime {
		if (sentiment >= 0.9) {
			return {
				type: 'EUPHORIA',
				duration: this.randomInt(3, 6),
				intensityMultiplier: 1.5,
				sentimentThreshold: 0.9,
			};
		} else if (sentimentTrend > 0.02 && sentiment > 0.7) {
			return {
				type: 'RALLY',
				duration: this.randomInt(4, 8),
				intensityMultiplier: 1.2,
				sentimentThreshold: 0.7,
			};
		} else if (sentimentTrend < -0.02 && sentiment < 0.6) {
			return {
				type: 'PULLBACK',
				duration: this.randomInt(3, 7),
				intensityMultiplier: 0.7,
				sentimentThreshold: 0.6,
			};
		} else {
			return {
				type: 'CHOP',
				duration: this.randomInt(5, 10),
				intensityMultiplier: 0.85,
				sentimentThreshold: 0.5,
			};
		}
	}

	private calculatePoissonDelay(baseMs: number): number {
		// More natural timing distribution
		const lambda = 1 / Math.max(baseMs, 100);
		let delay = -Math.log(Math.random()) / lambda;

		// Persona-based reaction speed adjustment
		delay *= this.persona.reactionSpeed;

		// Add realistic jitter (humans aren't perfect)
		delay += Math.random() * baseMs * 0.4;

		// Apply cooldown multiplier from previous failures
		delay *= this.state.cooldownMultiplier;

		return Math.max(50, Math.floor(delay));
	}

	private shouldTriggerMisclick(): boolean {
		return Math.random() < 0.03; // 3% chance
	}

	private getRegimeAdjustedSize(
		baseSize: string,
		regime: MarketRegime
	): string {
		const sizeHierarchy = ['small', 'medium', 'large', 'massive'];
		let currentIndex = sizeHierarchy.indexOf(baseSize);

		// Adjust size based on regime and persona
		if (regime.type === 'EUPHORIA' && this.persona.riskTolerance > 0.8) {
			currentIndex = Math.min(currentIndex + 1, sizeHierarchy.length - 1);
		} else if (regime.type === 'PULLBACK') {
			currentIndex = Math.max(currentIndex - 1, 0);
		}

		// Risk management: reduce size after losses
		if (this.state.consecutiveLosses >= 2) {
			currentIndex = Math.max(currentIndex - 1, 0);
		}

		return sizeHierarchy[currentIndex];
	}

	private calculateDynamicSlippage(
		sentiment: number,
		regime: MarketRegime
	): number {
		let baseSlippage = 450;

		// Lower slippage in calm conditions
		if (sentiment > 0.8 && regime.type === 'CHOP') {
			baseSlippage -= 80;
		}

		// Higher slippage during volatility
		if (regime.type === 'EUPHORIA' || regime.type === 'PULLBACK') {
			baseSlippage += 100;
		}

		// Persona-based slippage tolerance
		const personalityAdjustment = (1 - this.persona.riskTolerance) * 50;
		baseSlippage += personalityAdjustment;

		return Math.max(300, Math.min(600, baseSlippage + this.randomInt(-30, 30)));
	}

	private shouldExecuteAction(
		sentiment: number,
		regime: MarketRegime
	): { action: 'buy' | 'sell' | 'pause'; reason: string } {
		// Hard position cap
		if (this.state.netPosition >= 3.5) {
			return { action: 'sell', reason: 'position_cap_reached' };
		}

		// Drawdown protection
		const currentDrawdown =
			(this.state.peakPnL - this.state.estimatedPnL) /
			Math.max(this.state.peakPnL, 1);
		if (currentDrawdown > 0.18) {
			// 18% drawdown
			return { action: 'sell', reason: 'drawdown_protection' };
		}

		// Anti-repetition logic
		const lastThree = this.recentActions.slice(-3);
		if (lastThree.length === 3) {
			const allSame = lastThree.every(
				(action) => action.split('-')[0] === lastThree[0].split('-')[0]
			);
			if (allSame && regime.type !== 'EUPHORIA') {
				const oppositeAction = lastThree[0].includes('BUY') ? 'sell' : 'buy';
				return { action: oppositeAction, reason: 'anti_repetition' };
			}
		}

		// Consecutive loss management
		if (this.state.consecutiveLosses >= 2) {
			if (Math.random() < 0.6) {
				return { action: 'pause', reason: 'consecutive_losses' };
			}
		}

		// Profit taking after wins
		if (this.state.consecutiveWins >= 3 && sentiment > 0.7) {
			return { action: 'sell', reason: 'profit_taking' };
		}

		// Core persona-based decision
		let buyProbability = this.persona.buyBias;

		// Regime adjustments
		buyProbability *= regime.intensityMultiplier;

		// Sentiment influence
		buyProbability *= Math.pow(sentiment, 0.7); // Dampened sentiment influence

		// Risk tolerance modulation
		const riskAdjustment = 0.8 + this.persona.riskTolerance * 0.4;
		buyProbability *= riskAdjustment;

		if (Math.random() < buyProbability) {
			return { action: 'buy', reason: `persona_${this.persona.name}` };
		} else {
			return { action: 'sell', reason: `persona_${this.persona.name}` };
		}
	}

	getProgram(): Program<Dumpfun> {
		return this.rpcStrategy === 'rotation'
			? this.simulator.getNextProgram()
			: this.simulator.getRandomProgram();
	}

	async executeBuy(mint: string, sizeCategory: string): Promise<any> {
		try {
			const program = this.getProgram();
			const mintPubkey = new PublicKey(mint);
			const startTime = Date.now();

			// Heavy-tailed distribution for more realistic sizing
			const amounts = this.simulator.getBuyAmounts()[sizeCategory];
			const weightedAmounts =
				sizeCategory === 'small'
					? [amounts[0], amounts[0], amounts[1], amounts[2]] // Bias toward smaller
					: amounts;

			const amount = this.simulator.getRandomElement<number>(weightedAmounts);

			const slippage = this.calculateDynamicSlippage(
				this.simulator.getMarketSentiment(),
				this.currentRegime!
			);

			console.log(
				`[${this.id}] 🚀 BUY: ${amount} SOL (${sizeCategory.toUpperCase()}) ` +
					`on ${mint.slice(0, 8)}... | Slippage: ${slippage}bps | ${
						this.persona.name
					}`
			);

			const tx = await program.methods
				.buy(new BN(amount * LAMPORTS_PER_SOL), new BN(slippage))
				.accounts({
					mint: mintPubkey,
					buyer: this.simulator.getWallet().publicKey,
				})
				.signers([this.simulator.getWallet()])
				.rpc({ skipPreflight: true });

			// Update state
			this.state.netPosition += amount;
			this.state.totalVolume += amount;
			this.state.avgEntryPrice =
				(this.state.avgEntryPrice * (this.state.netPosition - amount) +
					amount * 1.0) /
				this.state.netPosition; // Simplified entry price tracking

			const duration = Date.now() - startTime;
			console.log(
				`[${this.id}] ✅ BUY completed in ${duration}ms - TX: ${tx.slice(
					0,
					12
				)}...`
			);

			return {
				success: true,
				tx,
				duration,
				type: 'buy',
				amount,
				mint,
				size: sizeCategory,
				slippage,
			};
		} catch (error) {
			console.error(`[${this.id}] ❌ BUY failed:`, error.message);
			return {
				success: false,
				error: error.message,
				type: 'buy',
				size: sizeCategory,
				mint,
			};
		}
	}

	async executeSell(mint: string, sizeCategory: string): Promise<any> {
		try {
			const program = this.getProgram();
			const mintPubkey = new PublicKey(mint);
			const startTime = Date.now();

			// Intelligent sell percentage selection
			const percentages = this.simulator.getSellPercentages()[sizeCategory];
			let percentage: number;

			// Prefer smaller sells during strength, larger during weakness
			if (
				this.simulator.getMarketSentiment() > 0.75 &&
				sizeCategory === 'tiny'
			) {
				percentage = percentages[0]; // Smallest sell during strength
			} else if (this.state.netPosition > 2.5 && sizeCategory === 'medium') {
				percentage = this.simulator.getRandomElement(percentages.slice(1)); // Larger sells when overweight
			} else {
				percentage = this.simulator.getRandomElement(percentages);
			}

			const estimatedSold = this.state.netPosition * (percentage / 100);
			const slippage = this.calculateDynamicSlippage(
				this.simulator.getMarketSentiment(),
				this.currentRegime!
			);

			console.log(
				`[${
					this.id
				}] 📉 SELL: ${percentage}% (${sizeCategory.toUpperCase()}) ` +
					`on ${mint.slice(0, 8)}... | Est. ${estimatedSold.toFixed(2)} SOL | ${
						this.persona.name
					}`
			);

			const tx = await program.methods
				.sell(new anchor.BN(percentage * 100), true, new anchor.BN(slippage))
				.accounts({
					mint: mintPubkey,
					seller: this.simulator.getWallet().publicKey,
				})
				.signers([this.simulator.getWallet()])
				.rpc({ skipPreflight: true });

			// Update state with profit estimation
			const soldAmount = this.state.netPosition * (percentage / 100);
			this.state.netPosition = Math.max(0, this.state.netPosition - soldAmount);
			this.state.totalVolume += soldAmount;

			// Simplified P&L calculation (assume small profit on sells)
			const estimatedProfit = soldAmount * 0.03; // 3% average profit assumption
			this.state.estimatedPnL += estimatedProfit;
			this.state.peakPnL = Math.max(
				this.state.peakPnL,
				this.state.estimatedPnL
			);

			const duration = Date.now() - startTime;
			console.log(
				`[${this.id}] ✅ SELL completed in ${duration}ms - TX: ${tx.slice(
					0,
					12
				)}...`
			);

			return {
				success: true,
				tx,
				duration,
				type: 'sell',
				percentage,
				mint,
				size: sizeCategory,
				estimatedSold: soldAmount,
				slippage,
			};
		} catch (error) {
			console.error(`[${this.id}] ❌ SELL failed:`, error.message);
			return {
				success: false,
				error: error.message,
				type: 'sell',
				size: sizeCategory,
				mint,
			};
		}
	}

	async executeEnhancedTrade(): Promise<any> {
		const sentiment = this.simulator.getMarketSentiment();
		const sentimentTrend = this.simulator.getSentimentTrend();

		// Update or determine market regime
		if (!this.currentRegime || this.currentRegime.duration <= 0) {
			this.currentRegime = this.determineMarketRegime(
				sentiment,
				sentimentTrend
			);
			console.log(
				`[${this.id}] 🎯 New regime: ${this.currentRegime.type} (${this.currentRegime.duration} actions)`
			);
		} else {
			this.currentRegime.duration--;
		}

		// Check for misclick/hesitation
		if (this.shouldTriggerMisclick()) {
			const hesitationTime = this.calculatePoissonDelay(1500);
			console.log(
				`[${this.id}] 🤔 Hesitating... (${hesitationTime}ms) - ${this.persona.name}`
			);
			await this.sleep(hesitationTime);
			return {
				success: true,
				type: 'hesitation',
				mint: 'none',
				duration: hesitationTime,
				persona: this.persona.name,
			};
		}

		// Determine action
		const decision = this.shouldExecuteAction(sentiment, this.currentRegime);

		if (decision.action === 'pause') {
			const pauseTime = this.calculatePoissonDelay(2000);
			console.log(
				`[${this.id}] ⏸️ Pausing (${decision.reason}) - ${pauseTime}ms`
			);
			await this.sleep(pauseTime);
			return {
				success: true,
				type: 'pause',
				reason: decision.reason,
				mint: 'none',
				duration: pauseTime,
				persona: this.persona.name,
			};
		}

		// Smart mint selection
		let mint: string;
		if (Math.random() < 0.65) {
			// Prefer focus mint most of the time
			mint = this.simulator.getRandomElement(this.preferredMints);
		} else {
			// Occasionally trade other mints for variety
			mint = this.simulator.getRandomElement(this.simulator.getMints());
		}

		let result;
		const baseDelay = this.calculatePoissonDelay(800);

		if (decision.action === 'buy') {
			// Size selection with persona bias and regime adjustment
			const baseSizeCategory = this.simulator.getRandomElement(
				this.persona.sizePreference
			);
			const sizeCategory = this.getRegimeAdjustedSize(
				baseSizeCategory,
				this.currentRegime
			);

			result = await this.executeBuy(mint, sizeCategory);

			if (result.success) {
				this.state.consecutiveWins++;
				this.state.consecutiveLosses = 0;
				this.state.cooldownMultiplier = Math.max(
					0.8,
					this.state.cooldownMultiplier * 0.95
				);
				this.recentActions.push(`BUY-${sizeCategory}`);
			} else {
				this.state.consecutiveLosses++;
				this.state.consecutiveWins = 0;
				this.state.cooldownMultiplier *= 1.4;
			}
		} else {
			// Intelligent sell sizing
			const sellSizes = ['tiny', 'small', 'medium'];
			let sizeCategory = 'tiny'; // Default to tiny for profit preservation

			if (this.state.netPosition > 2.5) {
				sizeCategory = 'small'; // Larger sells when overweight
			}
			if (this.currentRegime.type === 'EUPHORIA' && Math.random() < 0.3) {
				sizeCategory = 'tiny'; // Preserve position in euphoria
			}
			if (
				decision.reason === 'position_cap_reached' ||
				decision.reason === 'drawdown_protection'
			) {
				sizeCategory = 'medium'; // Aggressive selling for risk management
			}

			result = await this.executeSell(mint, sizeCategory);

			if (result.success) {
				this.state.consecutiveWins++;
				this.state.consecutiveLosses = 0;
				this.state.cooldownMultiplier = Math.max(
					0.9,
					this.state.cooldownMultiplier * 0.98
				);
				this.recentActions.push(`SELL-${sizeCategory}`);
			} else {
				this.state.consecutiveLosses++;
				this.state.consecutiveWins = 0;
				this.state.cooldownMultiplier *= 1.2;
			}
		}

		// Trim action history
		if (this.recentActions.length > 5) {
			this.recentActions = this.recentActions.slice(-5);
		}

		// Natural post-action delay
		await this.sleep(baseDelay);

		this.actionCount++;

		// Periodic status updates
		if (this.actionCount % 8 === 0) {
			console.log(
				`[${this.id}] 📊 ${
					this.persona.name
				} | Net: ${this.state.netPosition.toFixed(2)} SOL | ` +
					`PnL: ${this.state.estimatedPnL.toFixed(2)} | Win streak: ${
						this.state.consecutiveWins
					} | ` +
					`Regime: ${this.currentRegime.type}`
			);
		}

		return {
			...result,
			persona: this.persona.name,
			regime: this.currentRegime.type,
		};
	}

	randomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

class EnhancedMarketMaker extends EnhancedBullishTradingBot {
	constructor(
		simulator: EnhancedBullishTradingSimulator,
		id: string,
		focusMint: string
	) {
		const mmPersona: TradingPersona = {
			name: 'market_maker',
			buyBias: 0.6,
			sizePreference: ['medium', 'medium', 'small'],
			riskTolerance: 0.7,
			reactionSpeed: 1.0,
			description: 'Liquidity provider with balanced approach',
		};

		super(simulator, id, mmPersona, [focusMint], 'rotation');
	}

	async provideBullishLiquidity(): Promise<any[]> {
		const mint = this.preferredMints[0];
		const operations = [];
		const sentiment = this.simulator.getMarketSentiment();

		// Provide liquidity with bullish bias
		if (sentiment > 0.6) {
			// In bullish conditions: medium buy + tiny sell to add net buying pressure
			operations.push(
				this.executeBuy(mint, 'medium'),
				this.sleep(this.randomInt(200, 800)).then(() =>
					this.executeSell(mint, 'tiny')
				)
			);
		} else {
			// In bearish conditions: small buy + small sell for balanced liquidity
			operations.push(
				this.executeBuy(mint, 'small'),
				this.sleep(this.randomInt(300, 600)).then(() =>
					this.executeSell(mint, 'small')
				)
			);
		}

		const results = await Promise.all(operations);
		return results
			.flat()
			.filter((r) => r && typeof r === 'object' && 'success' in r);
	}
}

// Main execution function
async function main() {
	const args = process.argv.slice(2);

	if (!args[0]) {
		console.error('❌ Please provide a mint address as argument');
		process.exit(1);
	}

	const simulator = new EnhancedBullishTradingSimulator(args[0]);
	await simulator.initialize();

	const config: TradingConfig = {
		tradeCooldownMs: 0, // Let personas handle their own timing
		batchIntervalMs: 800, // Base interval for natural breaks
		totalRounds: 45,
		marketMakerFrequency: 8,
		positionCapPerBot: 3.5,
		maxDrawdownPct: 18,
		recoveryPct: 8,
	};

	console.log('🧠 ENHANCED HUMAN-LIKE TRADING SIMULATION STARTING...');
	console.log(`🎯 Target mint: ${args[0]}`);
	console.log(`⚙️ Position cap: ${config.positionCapPerBot} SOL per bot`);
	console.log(
		`🛡️ Max drawdown: ${config.maxDrawdownPct}% with ${config.recoveryPct}% recovery threshold`
	);
	console.log(
		`🎭 ${TRADING_PERSONAS.length} unique personas will trade with human-like behavior`
	);
	console.log(
		`🌊 Market sentiment, news events, and regime changes will drive decisions\n`
	);

	try {
		await simulator.runEnhancedSimulation(config);
		console.log('\n🎉 Enhanced simulation completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Enhanced simulation failed:', error);
		console.error('Stack trace:', error.stack);
		process.exit(1);
	}
}

// Start the show
main();
