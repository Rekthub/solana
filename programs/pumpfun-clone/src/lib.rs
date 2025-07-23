use anchor_lang::{prelude::*, solana_program::program::invoke};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use solana_system_interface::instruction::transfer;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;

use constants::*;
use contexts::*;
use errors::*;
use instructions::*;

declare_id!("94Eu8hV6tL7qe4FktVEtQqzDNuHyCBCv29KM7GE8qYK9");

#[program]
pub mod pumpfun_clone {
    use super::*;

    pub fn initialize_token(
        ctx: Context<InitializeToken>,
        base_price: u64,
        fee_bps: u16,
        initial_supply: u64,
    ) -> Result<()> {
        initialize_token_ix(ctx, base_price, fee_bps, initial_supply)
    }
}
