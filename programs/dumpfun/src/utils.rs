use super::*;

pub fn calculate_min_tokens_with_slippage(amount: u64, basis_points: u64) -> u64 {
    amount - (amount * basis_points) / 10_000 // Subtract slippage for minimum
}

pub fn calculate_min_sol_with_slippage(amount: u64, basis_points: u64) -> u64 {
    amount - (amount * basis_points) / 10_000 // Subtract for minimum
}

pub fn transfer_sol<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_context = CpiContext::new(
        system_program.clone(),
        system_program::Transfer {
            from: from.clone(),
            to: to.clone(),
        },
    );
    system_program::transfer(cpi_context, amount)
}

pub fn transfer_tokens<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
        mint: mint.to_account_info(),
    };

    let cpi_ctx = if let Some(seeds) = signer_seeds {
        CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, seeds)
    } else {
        CpiContext::new(token_program.to_account_info(), cpi_accounts)
    };

    token_interface::transfer_checked(cpi_ctx, amount, mint.decimals)
}
