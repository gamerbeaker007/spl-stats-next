export const SUPPORT_VALIDATOR = "beaker007";
export const SUPPORT_VALIDATOR_BRAND = "spl-stats.com";
export const DONATION_ACCOUNT = "beaker007";
export const DONATION_MEMO = "donation to spl-stats.com";
export const MAX_VALIDATOR_VOTES = 10;

export const SUPPORTED_DONATION_CURRENCIES = ["DEC", "SPS", "HIVE", "HBD"] as const;
export type DonationCurrency = (typeof SUPPORTED_DONATION_CURRENCIES)[number];
