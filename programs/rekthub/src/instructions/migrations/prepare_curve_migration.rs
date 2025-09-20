use super::*;

pub fn prepare_curve_migration_ix(ctx: Context<PrepareCurveMigration>) -> Result<()> {
    require!(
        ctx.accounts.bonding_curve.is_bonding_curve_complete,
        Errors::BondingCurveNotComplete
    );

    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        BONDING_CURVE.as_bytes(),
        mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ]];
    let net_amount = ctx
        .accounts
        .bonding_curve
        .real_sol_reserves
        .checked_sub(MIGRATION_FEE)
        .ok_or(Errors::MathOverflow)?;

    utils::transfer_tokens(
        &ctx.accounts.associated_bonding_curve,
        &ctx.accounts.associated_migration_authority,
        &ctx.accounts.bonding_curve.to_account_info(),
        &ctx.accounts.mint,
        &ctx.accounts.token_program,
        ctx.accounts.associated_bonding_curve.amount,
        Some(&signer_seeds),
    )?;

    **ctx
        .accounts
        .bonding_curve
        .to_account_info()
        .try_borrow_mut_lamports()? -= ctx.accounts.bonding_curve.real_sol_reserves;

    **ctx
        .accounts
        .migration_authority
        .to_account_info()
        .try_borrow_mut_lamports()? += net_amount;

    **ctx
        .accounts
        .global_fee_vault
        .to_account_info()
        .try_borrow_mut_lamports()? += MIGRATION_FEE;

    let event = CurveMigrationPrepared {
        mint: ctx.accounts.mint.key(),
        bonding_curve: ctx.accounts.bonding_curve.key(),
        migration_authority: ctx.accounts.migration_authority.key(),
        token_amount: ctx.accounts.bonding_curve.real_token_reserves,
        sol_amount: ctx.accounts.bonding_curve.real_sol_reserves,
        timestamp: Clock::get()?.unix_timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
