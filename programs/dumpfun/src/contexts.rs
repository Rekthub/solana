use super::*;

#[event_cpi]
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: validated elsewhere in the program
    #[account(
      mut,
        seeds = [MINT_AUTHORITY.as_bytes()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub associated_bonding_curve: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        space = BondingCurve::INIT_SPACE + BondingCurve::DISCRIMINATOR.len(),
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

    /// CHECK: Metadata account must be the correct PDA
    #[account(
        mut,
        seeds = [
            METADATA.as_bytes(),
            mpl_token_metadata::ID.as_ref(),
            mint.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::ID,
        bump
    )]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: validated elsewhere in the program
    #[account(address = MetadataProgram)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[event]
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

#[event_cpi]
#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer
    )]
    pub associated_user: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [BONDING_CURVE.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub associated_bonding_curve: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: validated elsewhere in the program
    #[account(
      mut,
        seeds = [GLOBAL_FEE_VAULT.as_bytes()],
        bump
    )]
    pub global_fee_vault: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
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

#[event_cpi]
#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller
    )]
    pub associated_user: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [BONDING_CURVE.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub associated_bonding_curve: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: validated elsewhere in the program
    #[account(
        mut,
        seeds = [GLOBAL_FEE_VAULT.as_bytes()],
        bump
    )]
    pub global_fee_vault: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[event]
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
