use super::*;

#[error_code]
pub enum Errors {
    #[msg("Insufficient funds for the operation.")]
    InsufficientFunds,
}
