# DumpFun 🚀

**A Solana-based memecoin launchpad with bonding curve mechanics**

DumpFun is a decentralized token launch platform that enables anyone to create and trade memecoins using an automated bonding curve mechanism. Built on Solana using the Anchor framework, it provides fair price discovery and liquidity for newly launched tokens without requiring traditional market makers.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Bonding Curve Mechanics](#bonding-curve-mechanics)
- [Smart Contract Structure](#smart-contract-structure)
- [Instructions](#instructions)
- [State Management](#state-management)
- [Events](#events)
- [Security Features](#security-features)
- [Fees](#fees)
- [Deployment](#deployment)
- [Integration Guide](#integration-guide)
- [Testing](#testing)

## Overview

DumpFun implements a bonding curve-based token launch mechanism where:
- Token prices increase as more tokens are bought
- Token prices decrease as tokens are sold back to the curve
- All trades happen against the bonding curve contract, providing instant liquidity
- No need for traditional AMM pools or market makers during the initial phase

### Program ID
```
dumpz8FfmeKTUHg3WiZYTxwsFQAQSrCqpD4y474XBdR
```

## Key Features

### 🔄 **Automated Market Making**
- Built-in bonding curve provides instant liquidity
- No need to bootstrap liquidity pools
- Automated price discovery based on supply and demand

### 📈 **Fair Launch Mechanism**
- Equal opportunity for all participants
- Transparent pricing algorithm
- No pre-mining or insider allocations

### 💰 **Fee Structure**
- Platform takes a small fee on each transaction
- Creator pays initialization fee to deploy tokens
- Fees fund platform development and maintenance

### 🛡️ **Security Features**
- Slippage protection for all trades
- Overflow protection in mathematical operations
- Comprehensive error handling

### 🎯 **Graduation System**
- Tokens can "graduate" from bonding curve to traditional AMM
- Happens when bonding curve is fully sold out
- Enables transition to decentralized trading

## Architecture

### Core Components

1. **BondingCurve Account**: Stores token state and reserves
2. **Token Mint**: Standard SPL token mint
3. **Associated Token Accounts**: Hold tokens for users and bonding curve
4. **Global Fee Vault**: Collects platform fees
5. **Metadata Account**: Stores token name, symbol, and URI

### Account Relationships

```
Creator
├── Creates Token Mint
├── Initializes BondingCurve
├── Pays initialization fee
└── Sets token metadata

BondingCurve
├── Holds token reserves
├── Manages SOL reserves
├── Tracks virtual reserves (for pricing)
├── Handles buy/sell operations
└── Emits trading events

Users
├── Buy tokens from bonding curve
├── Sell tokens back to bonding curve
└── Pay trading fees
```

## Bonding Curve Mechanics

### Dual Reserve System

DumpFun uses both **virtual** and **real** reserves for optimal price discovery:

#### Virtual Reserves
- Used for price calculations
- Start at higher values to create initial liquidity depth
- Determine the shape of the bonding curve

#### Real Reserves  
- Track actual on-chain holdings
- Used for validation and graduation logic
- Represent true token/SOL balances

### Pricing Formula

**Buy Price Calculation:**
```rust
n = virtual_sol_reserves * virtual_token_reserves
i = virtual_sol_reserves + sol_amount
r = n / i + 1
tokens_received = virtual_token_reserves - r
```

**Sell Price Calculation:**
```rust
n = (token_amount * virtual_sol_reserves) / (virtual_token_reserves + token_amount)
fee = n * fee_basis_points / 10_000
sol_received = n - fee
```

### Price Discovery
- **Early trades**: Lower prices due to high virtual token reserves
- **Later trades**: Higher prices as virtual token reserves decrease
- **Graduation**: When all real tokens are sold, curve is complete

## Smart Contract Structure

### File Organization

```
src/
├── lib.rs              # Main program entry point
├── constants.rs        # Platform constants and configuration
├── contexts.rs         # Account contexts for instructions
├── errors.rs           # Custom error definitions  
├── state.rs            # Account state structures
├── utils.rs            # Helper functions
└── instructions/
    ├── initialize.rs   # Token creation logic
    ├── buy.rs          # Token purchase logic
    └── sell.rs         # Token selling logic
```

### Key Constants

```rust
// Token Economics (from constants/bonding.rs)
pub const TOTAL_TOKEN_SUPPLY: u64 = 1_000_000_000 * 1_000_000; // 1B tokens with 6 decimals
pub const VIRTUAL_SOL_RESERVES: u64 = 30 * 1_000_000_000; // 30 SOL (30 billion lamports)
pub const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000 * 1_000_000; // 1.073B tokens
pub const REAL_SOL_RESERVES: u64 = 0; // Starts at 0 lamports
pub const REAL_TOKEN_RESERVES: u64 = 793_100_000 * 1_000_000; // 793.1M tokens

// Fees (from constants/fees.rs)
pub const FEE_BPS: u64 = 100; // 1% trading fee
pub const TOKEN_INITIALISATION_FEE: u64 = 1_000_000_000 / 20; // 0.05 SOL
pub const DEF_SLIPPAGE_BPS: u64 = 50; // 0.5% default slippage

// Seeds (from constants/seeds.rs)
pub const BONDING_CURVE: &str = "bonding_curve";
pub const GLOBAL_FEE_VAULT: &str = "global_fee_vault";
pub const MINT_AUTHORITY: &str = "mint_authority";
pub const METADATA: &str = "metadata";
```

## Instructions

### 1. Initialize

Creates a new token with bonding curve mechanics.

**Parameters:**
- `name: String` - Token name
- `symbol: String` - Token symbol  
- `uri: String` - Metadata URI

**Process:**
1. Validates creator has sufficient funds for initialization fee
2. Creates token metadata using Metaplex standard
3. Mints total supply to bonding curve account
4. Initializes bonding curve state
5. Transfers initialization fee to global fee vault
6. Emits initialization event

**Accounts Required:**
- `creator` - Token creator (signer, pays fees)
- `mint` - Token mint account
- `mint_authority` - PDA controlling mint
- `bonding_curve` - Bonding curve state account
- `associated_bonding_curve` - Token account for bonding curve
- `global_fee_vault` - Fee collection account
- `metadata` - Token metadata account

### 2. Buy

Purchases tokens from the bonding curve.

**Parameters:**
- `amount_in_sol: u64` - SOL amount to spend
- `slippage_basis_points: Option<u64>` - Maximum acceptable slippage

**Process:**
1. Calculates trading fee from SOL amount
2. Determines tokens to receive based on net SOL
3. Applies slippage protection
4. Transfers tokens to buyer
5. Transfers net SOL to bonding curve
6. Transfers fees to global fee vault
7. Updates bonding curve state
8. Checks for graduation condition
9. Emits buy event

**Price Impact:**
- More SOL spent = higher price per token
- Virtual reserves adjust to reflect new market state
- Real reserves track actual holdings

### 3. Sell

Sells tokens back to the bonding curve.

**Parameters:**
- `amount: u64` - Token amount (exact tokens or percentage)
- `is_percentage: bool` - Whether amount is percentage or exact
- `slippage_basis_points: Option<u64>` - Maximum acceptable slippage

**Process:**
1. Calculates actual tokens to sell
2. Validates user has sufficient token balance
3. Determines SOL to receive (after fees)
4. Applies slippage protection
5. Transfers tokens from user to bonding curve
6. Transfers SOL from bonding curve to user
7. Transfers fees to global fee vault
8. Updates bonding curve state
9. Emits sell event

**Percentage Selling:**
- `amount = 5000` with `is_percentage = true` sells 50% of holdings
- `amount = 1000000` with `is_percentage = false` sells exactly 1M tokens

## State Management

### BondingCurve Account

```rust
pub struct BondingCurve {
    pub creator: Pubkey,                    // Token creator
    pub mint: Pubkey,                       // Token mint address
    pub authority: Pubkey,                  // Mint authority PDA
    pub real_sol_reserves: u64,             // Actual SOL held
    pub real_token_reserves: u64,           // Actual tokens held
    pub virtual_sol_reserves: u64,          // Virtual SOL for pricing
    pub virtual_token_reserves: u64,        // Virtual tokens for pricing
    pub total_token_supply: u64,            // Total token supply
    pub is_bonding_curve_complete: bool,    // Graduation status
}
```

**Key Methods:**
- `get_buy_price(amount: u64) -> u64` - Calculates tokens for SOL amount
- `get_sell_price(amount: u64, fee_bps: u64) -> u64` - Calculates SOL for token amount
- `is_ready_for_graduation() -> bool` - Checks if all tokens are sold

### Reserve Management

**Virtual Reserves:**
- Used exclusively for price calculations
- Create smooth bonding curve shape
- Allow for predictable price discovery

**Real Reserves:**
- Track actual on-chain balances
- Used for transaction validation
- Determine graduation status

**State Updates:**
- Buy: Decrease virtual token reserves, increase virtual SOL reserves
- Sell: Increase virtual token reserves, decrease virtual SOL reserves
- Always maintain mathematical consistency

## Events

All operations emit comprehensive events for off-chain tracking:

### OnInitializeEvent
```rust
pub struct OnInitializeEvent {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub bonding_curve: Pubkey,
    pub associated_bonding_curve: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub timestamp: i64,
}
```

### OnBuyEvent
```rust
pub struct OnBuyEvent {
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub sol_spent: u64,
    pub tokens_received: u64,
    pub fee_paid: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub is_bonding_curve_complete: bool,
    pub timestamp: i64,
}
```

### OnSellEvent
```rust
pub struct OnSellEvent {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub tokens_sold: u64,
    pub sol_received: u64,
    pub fee_paid: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub timestamp: i64,
}
```

**Event Usage:**
- Track all trading activity
- Build price charts and analytics
- Monitor bonding curve health
- Detect graduation events
- Calculate volume and fees

## Security Features

### Input Validation
- All amounts checked for overflow
- Slippage parameters validated
- Token balances verified before operations
- Reserve sufficiency confirmed

### Mathematical Safety
- 128-bit integers used for intermediate calculations
- Overflow protection in price calculations
- Division by zero prevention
- Minimum viable amounts enforced

### Access Control
- Only token creators can initialize tokens
- Mint authority controlled by PDA
- Users can only sell their own tokens
- Fee vault access restricted

### Error Handling
```rust
pub enum Errors {
    InsufficientFunds,           // Not enough SOL/tokens
    BondingCurveComplete,        // Trading after graduation
    SlippageExceeded,            // Price moved too much
    MathOverflow,                // Calculation overflow
    InvalidPercentage,           // Invalid percentage value
    InsufficientTokenBalance,    // Not enough tokens to sell
    InvalidAmount,               // Zero or negative amount
    InsufficientReserves,        // Bonding curve lacks reserves
}
```

## Fees

### Trading Fees
- **Rate**: 1% (100 basis points) on all trades
- **Buy trades**: Fee deducted from SOL amount before token calculation
- **Sell trades**: Fee deducted from SOL received
- **Collection**: Automatically sent to global fee vault

### Initialization Fee
- **Amount**: 0.05 SOL per token launch
- **Purpose**: Prevents spam token creation
- **Payment**: Required upfront from token creator

### Default Slippage
- **Default**: 0.5% (50 basis points)
- **Purpose**: Protects against price movement during transaction
- **Customizable**: Users can specify their own slippage tolerance
### Fee Distribution
All fees collected in global fee vault can be used for:
- Platform development and maintenance
- Community incentives and rewards
- Marketing and growth initiatives
- Infrastructure costs

## Getting Started

### Prerequisites

Before working with DumpFun, you'll need to set up your Solana development environment. Follow the comprehensive installation guide at:

**📚 [Anchor Installation Guide](https://www.anchor-lang.com/docs/installation)**

This will walk you through installing:
- **Rust** - Programming language for Solana programs
- **Solana CLI** - Command-line tools for Solana development
- **Anchor Framework** - Solana development framework
- **Node.js & Yarn** - For running tests and frontend integration

### Quick Verification

After installation, verify your setup:

```bash
# Check Rust version
rustc --version

# Check Solana CLI
solana --version

# Check Anchor CLI  
anchor --version

# Check Node.js
node --version
```

### Solana Configuration

Set up your Solana environment:

```bash
# Set cluster (devnet for testing)
solana config set --url devnet

# Generate a new keypair (if needed)
solana-keygen new

# Check your address and balance
solana address
solana balance
```

## Deployment

### Build and Deploy

Once prerequisites are installed:

### Build and Deploy

Once prerequisites are installed:

1. **Clone and Setup**
```bash
git clone <your-repo-url>
cd dumpfun
```

2. **Install Dependencies**
```bash
# Install Node.js dependencies for tests
npm install
# or
yarn install
```

3. **Build Program**
```bash
anchor build
```

4. **Run Tests**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your private keys
# WALLET_PRIVATE_KEY="" - Your main wallet private key (base58 encoded)
# RECIPIENT_PRIVATE_KEY="" - Test recipient wallet private key (base58 encoded)

# Run the test suite
anchor test
```

**Environment Setup:**
- The tests require private keys in base58 format
- `WALLET_PRIVATE_KEY` is used as the token creator and trader in tests
- `RECIPIENT_PRIVATE_KEY` can be used for multi-user test scenarios

5. **Deploy to Devnet**
```bash
anchor deploy --provider.cluster devnet
```

6. **Deploy to Mainnet**
```bash
anchor deploy --provider.cluster mainnet-beta
```

### Configuration
Update `Anchor.toml` with your program ID and cluster settings:

```toml
[programs.devnet]
dumpfun = "dumpz8FfmeKTUHg3WiZYTxwsFQAQSrCqpD4y474XBdR"

[programs.mainnet]  
dumpfun = "dumpz8FfmeKTUHg3WiZYTxwsFQAQSrCqpD4y474XBdR"
```

## Integration Guide

### Frontend Integration

**Install Dependencies:**
```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

**Basic Setup:**
```typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { PublicKey, Connection } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const programId = new PublicKey('dumpz8FfmeKTUHg3WiZYTxwsFQAQSrCqpD4y474XBdR');
```

**Initialize Token:**
```typescript
async function initializeToken(
  creator: Keypair,
  name: string,
  symbol: string,
  uri: string
) {
  const mint = Keypair.generate();
  
  await program.methods
    .initialize(name, symbol, uri)
    .accounts({
      creator: creator.publicKey,
      mint: mint.publicKey,
      // ... other accounts
    })
    .signers([creator, mint])
    .rpc();
}
```

**Buy Tokens:**
```typescript
async function buyTokens(
  buyer: Keypair,
  mint: PublicKey,
  amountInSol: number,
  slippageBps?: number
) {
  await program.methods
    .buy(new BN(amountInSol * LAMPORTS_PER_SOL), slippageBps)
    .accounts({
      buyer: buyer.publicKey,
      mint: mint,
      // ... other accounts
    })
    .signers([buyer])
    .rpc();
}
```

**Sell Tokens:**
```typescript
async function sellTokens(
  seller: Keypair,
  mint: PublicKey,
  amount: number,
  isPercentage: boolean,
  slippageBps?: number
) {
  await program.methods
    .sell(new BN(amount), isPercentage, slippageBps)
    .accounts({
      seller: seller.publicKey,
      mint: mint,
      // ... other accounts
    })
    .signers([seller])
    .rpc();
}
```

### Account Derivation

**Bonding Curve PDA:**
```typescript
const [bondingCurve] = PublicKey.findProgramAddressSync(
  [Buffer.from('bonding_curve'), mint.toBuffer()],
  programId
);
```

**Mint Authority PDA:**
```typescript
const [mintAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from('mint_authority')],
  programId
);
```

**Global Fee Vault PDA:**
```typescript
const [globalFeeVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('global_fee_vault')],
  programId
);
```

### Event Listening

```typescript
// Listen for buy events
const listener = program.addEventListener('OnBuyEvent', (event) => {
  console.log('Buy event:', {
    buyer: event.buyer.toString(),
    mint: event.mint.toString(),
    solSpent: event.solSpent.toNumber(),
    tokensReceived: event.tokensReceived.toNumber(),
    isComplete: event.isBondingCurveComplete
  });
});

// Remove listener when done
program.removeEventListener(listener);
```

## Testing

### Unit Tests

Run the test suite:
```bash
anchor test
```

### Test Coverage

The test suite covers:
- Token initialization with various parameters
- Buy operations with different amounts and slippage
- Sell operations with exact amounts and percentages
- Error conditions and edge cases
- Event emission verification
- State consistency checks
- Mathematical accuracy validation

### Example Test

```typescript
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
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.dumpfun as Program<Dumpfun>;
  const mint = Keypair.generate();
  const creator = Keypair.fromSecretKey(
    bs58.decode(process.env.WALLET_PRIVATE_KEY)
  );

  it('should initialize a mint, bonding curve, and mint tokens to the bonding curve!', async () => {
    const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_authority')],
      program.programId
    );

    // Create mint account
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: await getMinimumBalanceForRentExemptMint(
        anchor.AnchorProvider.env().connection
      ),
      programId: TOKEN_PROGRAM_ID,
    });

    // Initialize mint
    const initializeMintInstruction = createInitializeMintInstruction(
      mint.publicKey,
      6, // 6 decimals
      mintAuthorityPDA,
      null,
      TOKEN_PROGRAM_ID
    );

    // Initialize token with metadata
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

    console.log('Token creation transaction signature:', tx);
  });

  it('should buy 1 SOL worth of tokens from the bonding curve', async () => {
    const tx = await program.methods
      .buy(
        new BN(1 * LAMPORTS_PER_SOL), // 1 SOL in lamports
        new BN(50) // 0.5% slippage tolerance
      )
      .accounts({
        mint: mint.publicKey,
        buyer: creator.publicKey,
      })
      .signers([creator])
      .rpc({ skipPreflight: true });

    console.log('Token purchase transaction signature:', tx);
  });

  it('should sell 100% of tokens back to the bonding curve', async () => {
    const tx = await program.methods
      .sell(
        new anchor.BN(10_000), // 10,000 basis points = 100%
        true, // amount is percentage
        new anchor.BN(50) // 0.5% slippage tolerance
      )
      .accounts({
        mint: mint.publicKey,
        seller: creator.publicKey,
      })
      .signers([creator])
      .rpc({ skipPreflight: true });

    console.log('Token sale transaction signature:', tx);
  });
});
```

### Test Workflow

The test suite demonstrates the complete lifecycle:

1. **Initialization**: Creates mint account, sets up bonding curve, mints total supply
2. **Buying**: Purchases 1 SOL worth of tokens with 0.5% slippage protection  
3. **Selling**: Sells 100% of holdings back to bonding curve

### Key Test Features

- **Environment Setup**: Uses dotenv for private key management
- **Account Creation**: Manually creates mint account with proper rent exemption
- **Metadata Integration**: Sets up token metadata using Metaplex standard
- **Error Handling**: Uses `skipPreflight: true` for development testing
- **Comprehensive Coverage**: Tests all three main instructions

---

## Contributing

We welcome contributions to DumpFun! Please see our contributing guidelines and submit pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This smart contract is provided as-is. Users should conduct their own audits and due diligence before using in production. Trading cryptocurrencies involves substantial risk of loss.

---

**Built with ❤️ on Solana**