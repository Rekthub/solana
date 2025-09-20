use super::*;

pub fn sell_ix(
    ctx: Context<Sell>,
    amount: u64,
    is_percentage: bool,
    slippage_basis_points: Option<u64>,
) -> Result<()> {
    let slippage_bps = slippage_basis_points.unwrap_or(DEF_SLIPPAGE_BPS);

    let tokens_to_sell = if is_percentage {
        if amount > 10_000 {
            return Err(error!(Errors::InvalidPercentage));
        }

        (ctx.accounts.associated_user.amount * amount) / 10_000
    } else {
        amount
    };

    if ctx.accounts.associated_user.amount < tokens_to_sell {
        return Err(error!(Errors::InsufficientTokenBalance));
    }

    if tokens_to_sell == 0 {
        return Err(error!(Errors::InvalidAmount));
    }

    let sol_to_receive = ctx
        .accounts
        .bonding_curve
        .get_sell_price(tokens_to_sell, FEE_BPS)?;

    let min_sol_expected = utils::calculate_min_sol_with_slippage(sol_to_receive, slippage_bps);

    if sol_to_receive < min_sol_expected {
        return Err(error!(Errors::SlippageExceeded));
    }

    let gross_sol = (sol_to_receive * 10_000) / (10_000 - FEE_BPS);
    let fee = gross_sol - sol_to_receive;

    if ctx.accounts.bonding_curve.real_sol_reserves < gross_sol {
        return Err(error!(Errors::InsufficientReserves));
    }

    utils::transfer_tokens(
        &ctx.accounts.associated_user,
        &ctx.accounts.associated_bonding_curve,
        &ctx.accounts.seller.to_account_info(),
        &ctx.accounts.mint,
        &ctx.accounts.token_program,
        tokens_to_sell,
        None,
    )?;

    **ctx
        .accounts
        .bonding_curve
        .to_account_info()
        .try_borrow_mut_lamports()? -= sol_to_receive;
    **ctx.accounts.seller.try_borrow_mut_lamports()? += sol_to_receive;

    **ctx
        .accounts
        .bonding_curve
        .to_account_info()
        .try_borrow_mut_lamports()? -= fee;
    **ctx.accounts.global_fee_vault.try_borrow_mut_lamports()? += fee;

    ctx.accounts.bonding_curve.virtual_token_reserves += tokens_to_sell;
    ctx.accounts.bonding_curve.real_token_reserves += tokens_to_sell;
    ctx.accounts.bonding_curve.virtual_sol_reserves -= gross_sol;
    ctx.accounts.bonding_curve.real_sol_reserves -= gross_sol;

    let event = OnSellEvent {
        seller: ctx.accounts.seller.key(),
        mint: ctx.accounts.mint.key(),
        tokens_sold: tokens_to_sell,
        sol_received: sol_to_receive,
        fee_paid: fee,
        virtual_sol_reserves: ctx.accounts.bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: ctx.accounts.bonding_curve.virtual_token_reserves,
        real_sol_reserves: ctx.accounts.bonding_curve.real_sol_reserves,
        real_token_reserves: ctx.accounts.bonding_curve.real_token_reserves,
        timestamp: Clock::get()?.unix_timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
