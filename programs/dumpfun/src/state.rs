use super::*;

#[account]
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

    /// Calculate current market price per token in lamports
    /// Returns the price of 1 token in SOL lamports
    pub fn get_market_price(&self) -> Result<u64> {
        if self.is_bonding_curve_complete {
            return err!(Errors::BondingCurveComplete);
        }

        if self.virtual_token_reserves == 0 {
            return Ok(0);
        }

        // Price per token = virtual_sol_reserves / virtual_token_reserves
        // Both reserves are already in their base units (lamports and tokens)
        // So we can calculate directly
        let price_lamports = (self.virtual_sol_reserves as u128) * 1_000_000_000
            / (self.virtual_token_reserves as u128);

        Ok(price_lamports as u64)
    }

    /// Calculate market cap in SOL lamports
    /// Returns total market cap based on current price and total supply
    pub fn get_market_cap(&self) -> Result<u64> {
        if self.is_bonding_curve_complete {
            return err!(Errors::BondingCurveComplete);
        }

        // Simple calculation: market_cap = virtual_sol_reserves * total_supply / virtual_token_reserves
        // This avoids the intermediate price calculation and potential precision loss
        let market_cap_lamports = ((self.virtual_sol_reserves as u128)
            * (self.total_token_supply as u128))
            / (self.virtual_token_reserves as u128);

        Ok(market_cap_lamports as u64)
    }

    /// Get the current price for buying exactly 1 token (for comparison)
    pub fn get_single_token_buy_price(&self) -> Result<u64> {
        self.get_buy_price(1_000_000_000) // 1 token with 9 decimals
    }

    /// Check if bonding curve has reached graduation market cap threshold
    /// Returns true when market cap reaches the graduation threshold in SOL
    pub fn is_market_cap_complete(&self, graduation_threshold_sol: u64) -> Result<bool> {
        if self.is_bonding_curve_complete {
            return Ok(true);
        }

        let current_market_cap_lamports = self.get_market_cap()?;
        let threshold_lamports = graduation_threshold_sol * 1_000_000_000;
        Ok(current_market_cap_lamports >= threshold_lamports)
    }

    /// Convenience function to check graduation at 400 SOL market cap
    pub fn is_ready_for_graduation(&self) -> Result<bool> {
        self.is_market_cap_complete(400)
    }
}
