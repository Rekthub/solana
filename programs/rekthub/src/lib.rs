#![allow(deprecated)]
use anchor_lang::{prelude::*, solana_program::clock::Clock, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token},
    token_interface::{self, mint_to, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};
use mpl_token_metadata::{
    instructions::CreateMetadataAccountV3CpiBuilder, types::Creator, types::DataV2,
    ID as MetadataProgram,
};
use raydium_cp_swap;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use constants::*;
use contexts::*;
use errors::*;
use state::*;

declare_id!("rekthB7rsdX7nCT8aQi977noT72AtkqVDWt1Y9VmZFG");

#[program]
pub mod rekthub {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::initialize_ix(ctx, name, symbol, uri)
    }

    pub fn buy(
        ctx: Context<Buy>,
        amount_in_sol: u64,
        slippage_basis_points: Option<u64>,
    ) -> Result<()> {
        instructions::buy_ix(ctx, amount_in_sol, slippage_basis_points)
    }

    pub fn sell(
        ctx: Context<Sell>,
        amount: u64,
        is_percentage: bool,
        slippage_basis_points: Option<u64>,
    ) -> Result<()> {
        instructions::sell_ix(ctx, amount, is_percentage, slippage_basis_points)
    }

    pub fn prepare_curve_migration(ctx: Context<PrepareCurveMigration>) -> Result<()> {
        instructions::migrations::prepare_curve_migration_ix(ctx)
    }

    pub fn initialize_raydium_pool(ctx: Context<InitializeRaydiumPool>) -> Result<()> {
        instructions::migrations::raydium::initialize_pool(ctx)
    }
}
