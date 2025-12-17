/**
 * OPNet BTC Name Resolver - Constants
 *
 * This file contains all constants used by the BTC Name Resolver contract.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// Contenthash Type Identifiers
// =============================================================================

/** CIDv0 (Qm... prefixed, base58btc, 46 chars) */
export const CONTENTHASH_TYPE_CIDv0: u8 = 1;

/** CIDv1 (bafy... prefixed, base32) */
export const CONTENTHASH_TYPE_CIDv1: u8 = 2;

/** IPNS identifier (k... prefixed, base36) */
export const CONTENTHASH_TYPE_IPNS: u8 = 3;

/** Raw SHA-256 hash (32 bytes, stored as u256) */
export const CONTENTHASH_TYPE_SHA256: u8 = 4;

// =============================================================================
// String Length Limits
// =============================================================================

/** Maximum length of a domain name (without .btc suffix) */
export const MAX_DOMAIN_LENGTH: u32 = 63;

/** Minimum length of a domain name */
export const MIN_DOMAIN_LENGTH: u32 = 3;

/** Maximum length of a subdomain label */
export const MAX_SUBDOMAIN_LENGTH: u32 = 63;

/** Maximum length of a contenthash string (CID/IPNS) */
export const MAX_CONTENTHASH_LENGTH: u32 = 128;

/** Maximum total length of full name (subdomain.domain.btc) */
export const MAX_FULL_NAME_LENGTH: u32 = 253;

// =============================================================================
// TTL Defaults (in seconds)
// =============================================================================

/** Default TTL for domain records: 1 hour */
export const DEFAULT_TTL: u64 = 3600;

/** Minimum allowed TTL: 60 seconds */
export const MIN_TTL: u64 = 60;

/** Maximum allowed TTL: 1 week */
export const MAX_TTL: u64 = 604800;

// =============================================================================
// Pricing Defaults (in satoshis)
// =============================================================================

/** Default price to register a domain: 100,000 sats */
export const DEFAULT_DOMAIN_PRICE_SATS: u64 = 100_000;

/** Premium pricing for short domains (3 chars): 1,000,000 sats */
export const PREMIUM_3_CHAR_PRICE_SATS: u64 = 1_000_000;

/** Premium pricing for short domains (4 chars): 500,000 sats */
export const PREMIUM_4_CHAR_PRICE_SATS: u64 = 500_000;

// =============================================================================
// Reserved Domains
// =============================================================================

/** Reserved domain for contract deployer */
export const RESERVED_DOMAIN: string = 'opnet';
