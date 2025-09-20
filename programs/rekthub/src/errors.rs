use super::*;

#[error_code]
pub enum Errors {
    #[msg("Insufficient funds for the operation.")]
    InsufficientFunds,

    #[msg("Bonding curve complete.")]
    BondingCurveComplete,

    #[msg("Bonding curve not complete.")]
    BondingCurveNotComplete,

    #[msg("Bonding urve has been migrated.")]
    BondingCurveMigrated,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Math overflow occurred")]
    MathOverflow,

    #[msg("Invalid percentage. Must be between 0-10000 basis points")]
    InvalidPercentage,

    #[msg("Insufficient token balance")]
    InsufficientTokenBalance,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Insufficient reserves")]
    InsufficientReserves,
}
