use super::*;

#[derive(Accounts)]
#[instruction()]
pub struct InitializeToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub mint: Account<'info, Mint>,

    /// CHECK: validated elsewhere in the program
    #[account(
      mut,
        seeds = [MINT_AUTHORITY.as_bytes(), &mint.key().to_bytes()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: validated elsewhere in the program
    #[account(
      mut,
        seeds = [SOL_RESERVE.as_bytes(), &mint.key().to_bytes()],
        bump
    )]
    pub sol_reserve: UncheckedAccount<'info>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = mint_authority
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        space = 8 + 218,
        seeds = [BONDING_CURVE.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: validated elsewhere in the program
    #[account(
      mut,
        seeds = [GLOBAL_FEE_VAULT.as_bytes()],
        bump
    )]
    pub global_fee_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,

    pub sol_reserve: Pubkey,
    pub token_vault: Pubkey,

    pub sol_reserve_balance: u64,
    pub circulating_supply: u64,

    pub base_price: u64,
    pub is_bonding_curve_complete: bool,

    pub fee_bps: u16,
    pub collected_fees: u64,
}
