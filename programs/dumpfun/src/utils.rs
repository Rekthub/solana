pub fn calculate_min_tokens_with_slippage(amount: u64, basis_points: u64) -> u64 {
    amount - (amount * basis_points) / 10_000 // Subtract slippage for minimum
}

pub fn calculate_min_sol_with_slippage(amount: u64, basis_points: u64) -> u64 {
    amount - (amount * basis_points) / 10_000 // Subtract for minimum
}
