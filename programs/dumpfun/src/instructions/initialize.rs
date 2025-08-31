use super::*;

pub fn initialize_ix(
    ctx: Context<Initialize>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    let mint = &ctx.accounts.mint;
    let creator = &ctx.accounts.creator;
    let associated_bonding_curve = &ctx.accounts.associated_bonding_curve;
    let mint_authority = &ctx.accounts.mint_authority;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let global_fee_vault = &ctx.accounts.global_fee_vault;
    let system_program = &ctx.accounts.system_program;

    require!(
        **creator.to_account_info().lamports.borrow() >= TOKEN_INITIALISATION_FEE,
        Errors::InsufficientFunds
    );

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    let creators: Option<Vec<Creator>> = Some(vec![Creator {
        address: ctx.accounts.creator.key(),
        verified: true,
        share: 100,
    }]);

    let data_v2 = DataV2 {
        name: name.clone(),
        symbol: symbol.clone(),
        uri: uri.clone(),
        seller_fee_basis_points: 0,
        creators,
        collection: None,
        uses: None,
    };

    let signer_seeds: &[&[&[u8]]] = &[&[MINT_AUTHORITY.as_bytes(), &[ctx.bumps.mint_authority]]];

    CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
        .metadata(&ctx.accounts.metadata.to_account_info())
        .mint(&ctx.accounts.mint.to_account_info())
        .mint_authority(&ctx.accounts.mint_authority.to_account_info())
        .payer(&ctx.accounts.creator.to_account_info())
        .update_authority(&&ctx.accounts.creator.to_account_info(), true)
        .system_program(&ctx.accounts.system_program.to_account_info())
        .rent(Some(&ctx.accounts.rent.to_account_info()))
        .data(data_v2)
        .is_mutable(false)
        .invoke_signed(signer_seeds)?;

    let mint_token_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: mint.to_account_info(),
            to: associated_bonding_curve.to_account_info(),
            authority: mint_authority.to_account_info(),
        },
        signer_seeds,
    );

    mint_to(mint_token_cpi_ctx, TOTAL_TOKEN_SUPPLY)?;

    // Deduct contract fee
    transfer_sol(
        &creator.to_account_info(),
        &global_fee_vault.to_account_info(),
        &system_program.to_account_info(),
        TOKEN_INITIALISATION_FEE,
    )?;

    // Set bonding curve state
    bonding_curve.creator = creator.key();
    bonding_curve.mint = mint.key();
    bonding_curve.authority = mint_authority.key();

    bonding_curve.real_sol_reserves = REAL_SOL_RESERVES;
    bonding_curve.real_token_reserves = REAL_TOKEN_RESERVES;

    bonding_curve.virtual_sol_reserves = VIRTUAL_SOL_RESERVES;
    bonding_curve.virtual_token_reserves = VIRTUAL_TOKEN_RESERVES;

    bonding_curve.total_token_supply = TOTAL_TOKEN_SUPPLY;
    bonding_curve.is_bonding_curve_complete = false;

    let event = OnInitializeEvent {
        creator: creator.key(),
        mint: mint.key(),
        bonding_curve: bonding_curve.key(),
        associated_bonding_curve: associated_bonding_curve.key(),
        name,
        symbol,
        uri,
        virtual_sol_reserves: VIRTUAL_SOL_RESERVES,
        virtual_token_reserves: VIRTUAL_TOKEN_RESERVES,
        real_sol_reserves: REAL_SOL_RESERVES,
        real_token_reserves: REAL_TOKEN_RESERVES,
        timestamp,
    };

    emit_cpi!(event);

    // Fallback event emitter
    emit!(event);

    Ok(())
}
