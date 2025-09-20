use super::*;

pub fn buy_ix(
    ctx: Context<Buy>,
    amount_in_sol: u64,
    slippage_basis_points: Option<u64>,
) -> Result<()> {
    let slippage_bps = slippage_basis_points.unwrap_or(DEF_SLIPPAGE_BPS);
    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        BONDING_CURVE.as_bytes(),
        mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ]];

    let fee = (amount_in_sol * FEE_BPS) / 10_000;
    let net_amount = amount_in_sol - fee;

    let tokens_to_receive = ctx.accounts.bonding_curve.get_buy_price(net_amount)?;

    let min_tokens_expected =
        utils::calculate_min_tokens_with_slippage(tokens_to_receive, slippage_bps);

    if tokens_to_receive < min_tokens_expected {
        return Err(error!(Errors::SlippageExceeded));
    }

    utils::transfer_tokens(
        &ctx.accounts.associated_bonding_curve,
        &ctx.accounts.associated_user,
        &ctx.accounts.bonding_curve.to_account_info(),
        &ctx.accounts.mint,
        &ctx.accounts.token_program,
        tokens_to_receive,
        Some(&signer_seeds),
    )?;

    utils::transfer_sol(
        &ctx.accounts.buyer.to_account_info(),
        &ctx.accounts.bonding_curve.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        net_amount,
        None,
    )?;

    utils::transfer_sol(
        &ctx.accounts.buyer.to_account_info(),
        &ctx.accounts.global_fee_vault.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        fee,
        None,
    )?;

    ctx.accounts.bonding_curve.virtual_sol_reserves += net_amount;
    ctx.accounts.bonding_curve.real_token_reserves -= tokens_to_receive;
    ctx.accounts.bonding_curve.virtual_token_reserves -= tokens_to_receive;
    ctx.accounts.bonding_curve.real_sol_reserves += net_amount;
    ctx.accounts.bonding_curve.is_bonding_curve_complete =
        ctx.accounts.bonding_curve.is_ready_for_graduation()?;

    let event = OnBuyEvent {
        buyer: ctx.accounts.buyer.key(),
        mint: ctx.accounts.mint.key(),
        sol_spent: amount_in_sol,
        tokens_received: tokens_to_receive,
        fee_paid: fee,
        virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        real_sol_reserves: ctx.accounts.bonding_curve.real_sol_reserves,
        real_token_reserves: ctx.accounts.bonding_curve.real_token_reserves,
        is_bonding_curve_complete: ctx.accounts.bonding_curve.is_bonding_curve_complete,
        timestamp: Clock::get()?.unix_timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
