use super::*;

#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,

    // Real reserves (on-chain tracking)
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,

    // Virtual reserves (for pricing logic)
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,

    // Bookkeeping
    pub total_token_supply: u64,
    pub is_bonding_curve_complete: bool,
}

impl BondingCurve {
    pub fn get_buy_price(&self, amount: u64) -> Result<u64> {
        if self.is_bonding_curve_complete {
            return err!(Errors::BondingCurveComplete);
        }

        if amount == 0 {
            return Ok(0);
        }

        let n: u128 = (self.virtual_sol_reserves as u128) * (self.virtual_token_reserves as u128);
        let i: u128 = (self.virtual_sol_reserves as u128) + (amount as u128);
        let r: u128 = n / i + 1;
        let s: u128 = (self.virtual_token_reserves as u128) - r;

        let s_u64 = s as u64;
        Ok(std::cmp::min(s_u64, self.real_token_reserves))
    }

    pub fn get_sell_price(&self, amount: u64, fee_basis_points: u64) -> Result<u64> {
        if self.is_bonding_curve_complete {
            return err!(Errors::BondingCurveComplete);
        }

        if amount == 0 {
            return Ok(0);
        }

        let n: u128 = ((amount as u128) * (self.virtual_sol_reserves as u128))
            / ((self.virtual_token_reserves as u128) + (amount as u128));

        let fee: u128 = (n * fee_basis_points as u128) / 10_000;

        Ok((n - fee) as u64)
    }

    /// Check if entire virtual token reserves has been sold out
    pub fn is_ready_for_graduation(&self) -> Result<bool> {
        if self.is_bonding_curve_complete {
            return Ok(true);
        }

        Ok(self.real_token_reserves <= 0)
    }
}
