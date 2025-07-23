use super::*;

pub fn initialize_token_ix(
    ctx: Context<InitializeToken>,
    base_price: u64,
    fee_bps: u16,
    initial_supply: u64,
) -> Result<()> {
    let mint = &ctx.accounts.mint;
    let creator = &ctx.accounts.creator;
    let token_vault = &ctx.accounts.token_vault;
    let mint_authority = &ctx.accounts.mint_authority;
    let global_fee_vault = &ctx.accounts.global_fee_vault;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let system_program = &ctx.accounts.system_program;

    require!(
        **creator.to_account_info().lamports.borrow() >= TOKEN_INITIALISATION_FEE,
        Errors::InsufficientFunds
    );

    let signer_seeds: &[&[&[u8]]] = &[&[
        MINT_AUTHORITY.as_bytes(),
        &mint.key().to_bytes(),
        &[ctx.bumps.mint_authority],
    ]];

    // Mint tokens to the token vault
    let mint_token_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: mint.to_account_info(),
            to: token_vault.to_account_info(),
            authority: mint_authority.to_account_info(),
        },
        signer_seeds,
    );

    mint_to(mint_token_cpi_ctx, initial_supply)?;

    // Deduct contract fee
    let deduct_contract_fee_ix = transfer(
        &creator.key(),
        &global_fee_vault.key(),
        TOKEN_INITIALISATION_FEE,
    );

    invoke(
        &deduct_contract_fee_ix,
        &[
            creator.to_account_info(),
            global_fee_vault.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    // Store data in bonding curve
    bonding_curve.creator = ctx.accounts.creator.key();
    bonding_curve.mint = mint.key();
    bonding_curve.authority = mint_authority.key();
    bonding_curve.sol_reserve = ctx.accounts.sol_reserve.key();
    bonding_curve.token_vault = token_vault.key();
    bonding_curve.sol_reserve_balance = 0;
    bonding_curve.circulating_supply = initial_supply;
    bonding_curve.base_price = base_price;
    bonding_curve.fee_bps = fee_bps;
    bonding_curve.collected_fees = 0;
    bonding_curve.is_bonding_curve_complete = false;

    Ok(())
}
