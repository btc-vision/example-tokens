/**
 * OPNet Package Registry - Constants
 *
 * This file contains all constants used by the Package Registry contract.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// MLDSA Security Levels
// =============================================================================

/** MLDSA-44: Security level 2, ~128-bit security (smallest signatures) */
export const MLDSA44: u8 = 1;

/** MLDSA-65: Security level 3, ~192-bit security (medium signatures) */
export const MLDSA65: u8 = 2;

/** MLDSA-87: Security level 5, ~256-bit security (largest signatures) */
export const MLDSA87: u8 = 3;

// MLDSA Signature Sizes (in bytes)
/** MLDSA-44 signature size: 2420 bytes */
export const MLDSA44_SIG_SIZE: u32 = 2420;

/** MLDSA-65 signature size: 3309 bytes */
export const MLDSA65_SIG_SIZE: u32 = 3309;

/** MLDSA-87 signature size: 4627 bytes */
export const MLDSA87_SIG_SIZE: u32 = 4627;

// =============================================================================
// Plugin Types
// =============================================================================

/** Standalone plugin that runs independently */
export const PLUGIN_STANDALONE: u8 = 1;

/** Library plugin that provides shared functionality */
export const PLUGIN_LIBRARY: u8 = 2;

// =============================================================================
// String Length Limits
// =============================================================================

/** Maximum length of a scope name (without @) */
export const MAX_SCOPE_LENGTH: u32 = 32;

/** Maximum length of an unscoped package name */
export const MAX_NAME_LENGTH: u32 = 64;

/** Maximum length of a version string (semver) */
export const MAX_VERSION_LENGTH: u32 = 32;

/** Maximum length of an IPFS CID string */
export const MAX_CID_LENGTH: u32 = 128;

/** Maximum length of an OPNet version range string */
export const MAX_OPNET_RANGE_LENGTH: u32 = 64;

/** Maximum length of a deprecation reason string */
export const MAX_REASON_LENGTH: u32 = 256;

// =============================================================================
// Time Constants
// =============================================================================

/** 72-hour mutability window in seconds (72 * 60 * 60 = 259200) */
export const MUTABILITY_WINDOW: u64 = 259200;

// =============================================================================
// Pricing Defaults (in satoshis)
// =============================================================================

/** Default price to register an unscoped package: 10,000 sats */
export const DEFAULT_PACKAGE_PRICE_SATS: u64 = 10000;

/** Default price to register a scope: ~$50 worth of sats (adjustable by owner) */
export const DEFAULT_SCOPE_PRICE_SATS: u64 = 5000000;

// =============================================================================
// Reserved Scopes
// =============================================================================

/** The @opnet scope is reserved for the contract deployer */
export const RESERVED_SCOPE: string = 'opnet';

// =============================================================================
// Byte Size Constants (for event data calculation)
// =============================================================================

/** Size of an Address in bytes */
export const ADDRESS_BYTE_LENGTH: u32 = 32;

/** Size of a u256 in bytes */
export const U256_BYTE_LENGTH: u32 = 32;

/** Size of a u64 in bytes */
export const U64_BYTE_LENGTH: u32 = 8;

/** Size of a u32 in bytes */
export const U32_BYTE_LENGTH: u32 = 4;

/** Size of a u8 in bytes */
export const U8_BYTE_LENGTH: u32 = 1;

/** Size of a boolean in bytes */
export const BOOLEAN_BYTE_LENGTH: u32 = 1;

/** SHA256 hash output size in bytes */
export const HASH_BYTE_LENGTH: u32 = 32;
