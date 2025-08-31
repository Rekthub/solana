use super::*;

pub fn buy_ix(
    ctx: Context<Buy>,
    amount_in_sol: u64,
    slippage_basis_points: Option<u64>,
) -> Result<()> {
    let buyer = &ctx.accounts.buyer;
    let mint = &ctx.accounts.mint;
    let mint_key = mint.key();

    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let associated_bonding_curve = &ctx.accounts.associated_bonding_curve;
    let associated_user = &ctx.accounts.associated_user;
    let global_fee_vault = &ctx.accounts.global_fee_vault;
    let system_program = &ctx.accounts.system_program;
    let token_program = &ctx.accounts.token_program;
    let slippage_bps = slippage_basis_points.unwrap_or(DEF_SLIPPAGE_BPS);
    let signer_seeds: &[&[&[u8]]] = &[&[
        BONDING_CURVE.as_bytes(),
        mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ]];

    // 1. Calculate fee and net amount first
    let fee = (amount_in_sol * FEE_BPS) / 10_000;
    let net_amount = amount_in_sol - fee;

    // 2. Calculate tokens based on NET amount (what actually goes to reserves)
    let tokens_to_receive = bonding_curve.get_buy_price(net_amount)?;

    // 3. Apply slippage check
    let min_tokens_expected = calculate_min_tokens_with_slippage(tokens_to_receive, slippage_bps);
    if tokens_to_receive < min_tokens_expected {
        return Err(error!(Errors::SlippageExceeded));
    }

    // 4. Transfer tokens to buyer
    transfer_tokens(
        associated_bonding_curve,
        associated_user,
        &bonding_curve.to_account_info(),
        &mint,
        token_program,
        tokens_to_receive,
        Some(&signer_seeds),
    )?;

    // 5. Transfer SOL to reserve (net amount)
    transfer_sol(
        &buyer.to_account_info(),
        &bonding_curve.to_account_info(),
        &system_program.to_account_info(),
        net_amount,
    )?;

    // 6. Transfer fee to global fee vault
    transfer_sol(
        &buyer.to_account_info(),
        &global_fee_vault.to_account_info(),
        &system_program.to_account_info(),
        fee,
    )?;

    // 7. Update bonding curve state
    bonding_curve.virtual_sol_reserves += net_amount;
    bonding_curve.real_token_reserves -= tokens_to_receive;
    bonding_curve.virtual_token_reserves -= tokens_to_receive;
    bonding_curve.real_sol_reserves += net_amount;
    bonding_curve.is_bonding_curve_complete = bonding_curve.is_ready_for_graduation()?;

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    let event = OnBuyEvent {
        buyer: buyer.key(),
        mint: mint.key(),
        sol_spent: amount_in_sol,
        tokens_received: tokens_to_receive,
        fee_paid: fee,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        real_sol_reserves: bonding_curve.real_sol_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        is_bonding_curve_complete: bonding_curve.is_bonding_curve_complete,
        timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
