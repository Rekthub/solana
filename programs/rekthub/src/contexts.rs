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

#[event_cpi]
#[derive(Accounts)]
pub struct InitializeRaydiumPool<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: Raydium AMM configuration PDA
    #[account(
        mut,
        seeds = [
            b"amm_config", 
            &constants::raydium::POOL_INDEX.to_le_bytes()
        ],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub amm_config: UncheckedAccount<'info>,

    /// CHECK: Migration authority PDA that holds funds for pool initialization
    #[account(
        mut,
        seeds = [MIGRATION_AUTHORITY.as_bytes(), mint_1.key().as_ref()],
        bump
    )]
    pub migration_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint_1,
        associated_token::authority = migration_authority
    )]
    pub associated_migration_authority: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = mint_0.key() < mint_1.key(),
        mint::token_program = mint_0_program,
    )]
    pub mint_0: Box<InterfaceAccount<'info, Mint>>,

    #[account(mint::token_program = mint_1_program)]
    pub mint_1: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint_0,
        associated_token::authority = migration_authority,
    )]
    pub associated_mint_0: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Raydium fee receiver account
    #[account(
        mut,
        address = raydium_cp_swap::create_pool_fee_reveiver::ID,
    )]
    pub create_pool_fee: UncheckedAccount<'info>,

    /// CHECK: Raydium pool authority PDA
    #[account(
        mut,
        seeds = [raydium_cp_swap::AUTH_SEED.as_bytes()],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub authority: UncheckedAccount<'info>,

    /// CHECK: Raydium pool state PDA - will be created by Raydium
    #[account(
        mut,
        seeds = [
            raydium_cp_swap::states::POOL_SEED.as_bytes(),
            amm_config.key().as_ref(),
            mint_0.key().as_ref(),
            mint_1.key().as_ref(),
        ],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub pool_state: UncheckedAccount<'info>,

    /// CHECK: LP mint - will be created by Raydium
    #[account(mut)]
    pub lp_mint: UncheckedAccount<'info>,

    /// CHECK: Creator LP token account - will be created by Raydium
    #[account(mut)]
    pub creator_lp_token: UncheckedAccount<'info>,

    /// CHECK: Raydium token vault for mint_0
    #[account(
        mut,
        seeds = [
            raydium_cp_swap::states::POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            mint_0.key().as_ref(),
        ],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub mint_0_vault: UncheckedAccount<'info>,

    /// CHECK: Raydium token vault for mint_1
    #[account(
        mut,
        seeds = [
            raydium_cp_swap::states::POOL_VAULT_SEED.as_bytes(),
            pool_state.key().as_ref(),
            mint_1.key().as_ref(),
        ],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub mint_1_vault: UncheckedAccount<'info>,

    /// CHECK: Raydium oracle observations account
    #[account(
        mut,
        seeds = [
            raydium_cp_swap::states::OBSERVATION_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        bump,
        seeds::program = raydium_cp_swap::ID,
    )]
    pub observation_state: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [BONDING_CURVE.as_bytes(), mint_1.key().as_ref()],
        bump
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    /// CHECK: Raydium program ID
    #[account(address = raydium_cp_swap::ID)]
    pub raydium_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub mint_0_program: Interface<'info, TokenInterface>,
    pub mint_1_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct RaydiumPoolInitialized {
    pub mint_0: Pubkey,
    pub mint_1: Pubkey,
    pub pool_state: Pubkey,
    pub lp_mint: Pubkey,
    pub migration_authority: Pubkey,
    pub bonding_curve: Pubkey,
    pub initial_token_0_amount: u64,
    pub initial_token_1_amount: u64,
    pub lp_tokens_minted: u64,
    pub timestamp: i64,
}

#[event_cpi]
#[derive(Accounts)]
pub struct PrepareCurveMigration<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: Global fee vault PDA
    #[account(
        mut,
        seeds = [GLOBAL_FEE_VAULT.as_bytes()],
        bump
    )]
    pub global_fee_vault: UncheckedAccount<'info>,

    /// CHECK: Migration authority PDA for this mint
    #[account(
        mut,
        seeds = [MIGRATION_AUTHORITY.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub migration_authority: UncheckedAccount<'info>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: Bonding curve state account
    #[account(
        mut, 
        seeds = [BONDING_CURVE.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub associated_bonding_curve: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = migration_authority
    )]
    pub associated_migration_authority: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct CurveMigrationPrepared {
    pub mint: Pubkey,
    pub bonding_curve: Pubkey,
    pub migration_authority: Pubkey,
    pub token_amount: u64,
    pub sol_amount: u64,
    pub timestamp: i64,
}