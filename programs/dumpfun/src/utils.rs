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