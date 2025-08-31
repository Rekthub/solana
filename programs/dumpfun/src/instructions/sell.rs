use super::*;

pub fn sell_ix(
    ctx: Context<Sell>,
    amount: u64,
    is_percentage: bool,
    slippage_basis_points: Option<u64>,
) -> Result<()> {
    let seller = &ctx.accounts.seller;
    let mint = &mut ctx.accounts.mint;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let associated_bonding_curve = &ctx.accounts.associated_bonding_curve;
    let associated_user = &ctx.accounts.associated_user;
    let global_fee_vault = &ctx.accounts.global_fee_vault;
    let token_program = &ctx.accounts.token_program;

    let slippage_bps = slippage_basis_points.unwrap_or(DEF_SLIPPAGE_BPS);

    // 1. Calculate actual tokens to sell
    let tokens_to_sell = if is_percentage {
        // Amount is percentage (in basis points, e.g., 5000 = 50%)
        if amount > 10_000 {
            return Err(error!(Errors::InvalidPercentage));
        }
        let user_balance = associated_user.amount;
        (user_balance * amount) / 10_000
    } else {
        // Amount is exact number of tokens
        amount
    };

    // 2. Validate user has enough tokens
    if associated_user.amount < tokens_to_sell {
        return Err(error!(Errors::InsufficientTokenBalance));
    }

    if tokens_to_sell == 0 {
        return Err(error!(Errors::InvalidAmount));
    }

    // 3. Calculate SOL to receive (with fee already deducted)
    let sol_to_receive = bonding_curve.get_sell_price(tokens_to_sell, FEE_BPS)?;

    // 4. Apply slippage check
    let min_sol_expected = calculate_min_sol_with_slippage(sol_to_receive, slippage_bps);
    if sol_to_receive < min_sol_expected {
        return Err(error!(Errors::SlippageExceeded));
    }

    // 5. Calculate gross SOL (before fee) and fee amount
    let gross_sol = (sol_to_receive * 10_000) / (10_000 - FEE_BPS);
    let fee = gross_sol - sol_to_receive;

    // 6. Validate bonding curve has enough SOL
    if bonding_curve.real_sol_reserves < gross_sol {
        return Err(error!(Errors::InsufficientReserves));
    }

    // 7. Transfer tokens from user to bonding curve
    transfer_tokens(
        associated_user,
        associated_bonding_curve,
        &seller.to_account_info(),
        &mint,
        token_program,
        tokens_to_sell,
        None,
    )?;

    // 8. Transfer sol from bonding curve to user
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_to_receive;
    **seller.try_borrow_mut_lamports()? += sol_to_receive;

    // 9. Transfer fees from bonding curve to fee vault
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? -= fee;
    **global_fee_vault.try_borrow_mut_lamports()? += fee;

    // 10. Update bonding curve state
    bonding_curve.virtual_token_reserves += tokens_to_sell;
    bonding_curve.real_token_reserves += tokens_to_sell;

    bonding_curve.virtual_sol_reserves -= gross_sol;
    bonding_curve.real_sol_reserves -= gross_sol;

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    let event = OnSellEvent {
        seller: seller.key(),
        mint: mint.key(),
        tokens_sold: tokens_to_sell,
        sol_received: sol_to_receive,
        fee_paid: fee,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        real_sol_reserves: bonding_curve.real_sol_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
