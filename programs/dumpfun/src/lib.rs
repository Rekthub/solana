#![allow(deprecated)]
use anchor_lang::{
    prelude::*,
    solana_program::{clock::Clock, program::invoke},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::CreateMetadataAccountV3CpiBuilder, types::Creator, types::DataV2,
    ID as MetadataProgram,
};
use solana_system_interface::instruction::transfer;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use constants::*;
use contexts::*;
use errors::*;
use instructions::*;
use state::*;
use utils::*;

declare_id!("dumpz8FfmeKTUHg3WiZYTxwsFQAQSrCqpD4y474XBdR");

#[program]
pub mod dumpfun {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        initialize_ix(ctx, name, symbol, uri)
    }

    pub fn buy(
        ctx: Context<Buy>,
        amount_in_sol: u64,
        slippage_basis_points: Option<u64>,
    ) -> Result<()> {
        buy_ix(ctx, amount_in_sol, slippage_basis_points)
    }

    pub fn sell(
        ctx: Context<Sell>,
        amount: u64,
        is_percentage: bool,
        slippage_basis_points: Option<u64>,
    ) -> Result<()> {
        sell_ix(ctx, amount, is_percentage, slippage_basis_points)
    }
}
