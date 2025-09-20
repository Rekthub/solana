use super::*;

pub use constants::raydium::*;

pub fn initialize_pool(ctx: Context<InitializeRaydiumPool>) -> Result<()> {
    require!(
        ctx.accounts.bonding_curve.is_bonding_curve_complete,
        Errors::BondingCurveNotComplete
    );

    require!(
        !ctx.accounts.bonding_curve.has_curve_migrated,
        Errors::BondingCurveMigrated
    );

    let mint_key = ctx.accounts.mint_1.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        MIGRATION_AUTHORITY.as_bytes(),
        mint_key.as_ref(),
        &[ctx.bumps.migration_authority],
    ]];

    let wrap_amount = ctx
        .accounts
        .migration_authority
        .lamports()
        .checked_sub(200_000_000)
        .ok_or(Errors::InsufficientFunds)?;

    let token_amount = ctx.accounts.associated_migration_authority.amount;

    utils::transfer_sol(
        &ctx.accounts.migration_authority,
        &ctx.accounts.associated_mint_0.to_account_info(),
        &ctx.accounts.system_program,
        wrap_amount,
        Some(signer_seeds),
    )?;

    token::sync_native(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::SyncNative {
            account: ctx.accounts.associated_mint_0.to_account_info(),
        },
    ))?;

    raydium_cp_swap::cpi::initialize(
        CpiContext::new_with_signer(
            ctx.accounts.raydium_program.to_account_info(),
            raydium_cp_swap::cpi::accounts::Initialize {
                creator: ctx.accounts.migration_authority.to_account_info(),
                amm_config: ctx.accounts.amm_config.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
                pool_state: ctx.accounts.pool_state.to_account_info(),
                token_0_mint: ctx.accounts.mint_0.to_account_info(),
                token_1_mint: ctx.accounts.mint_1.to_account_info(),
                lp_mint: ctx.accounts.lp_mint.to_account_info(),
                creator_token_0: ctx.accounts.associated_mint_0.to_account_info(),
                creator_token_1: ctx
                    .accounts
                    .associated_migration_authority
                    .to_account_info(),
                creator_lp_token: ctx.accounts.creator_lp_token.to_account_info(),
                token_0_vault: ctx.accounts.mint_0_vault.to_account_info(),
                token_1_vault: ctx.accounts.mint_1_vault.to_account_info(),
                create_pool_fee: ctx.accounts.create_pool_fee.to_account_info(),
                observation_state: ctx.accounts.observation_state.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                token_0_program: ctx.accounts.mint_0_program.to_account_info(),
                token_1_program: ctx.accounts.mint_1_program.to_account_info(),
                associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &signer_seeds,
        ),
        wrap_amount,
        token_amount,
        Clock::get()?.unix_timestamp as u64,
    )?;

    utils::transfer_sol(
        &ctx.accounts.migration_authority,
        &ctx.accounts.signer,
        &ctx.accounts.system_program,
        ctx.accounts.migration_authority.lamports(),
        Some(signer_seeds),
    )?;

    ctx.accounts.bonding_curve.has_curve_migrated = true;

    let event = RaydiumPoolInitialized {
        mint_0: ctx.accounts.mint_0.key(),
        mint_1: ctx.accounts.mint_1.key(),
        pool_state: ctx.accounts.pool_state.key(),
        lp_mint: ctx.accounts.lp_mint.key(),
        migration_authority: ctx.accounts.migration_authority.key(),
        bonding_curve: ctx.accounts.bonding_curve.key(),
        initial_token_0_amount: wrap_amount,
        initial_token_1_amount: token_amount,
        lp_tokens_minted: 0,
        timestamp: Clock::get()?.unix_timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
