export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative?: boolean; // For native tokens like MNT
  enabled: boolean;
}

export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xAcab8129E2cE587fD203FD770ec9ECAFA2C88080",
    decimals: 6,
    isNative: false,
    enabled: true,
  },
};

/**
 * Add a new token to the supported tokens list
 * @param symbol Token symbol (e.g., "USDT")
 * @param name Token name (e.g., "Tether USD")
 * @param address Token contract address
 * @param decimals Token decimals (default: 18)
 * @param enabled Whether the token is enabled (default: true)
 */
export function addToken(
  symbol: string,
  name: string,
  address: string,
  decimals: number = 18,
  enabled: boolean = true
): void {
  const upperSymbol = symbol.toUpperCase();

  if (SUPPORTED_TOKENS[upperSymbol]) {
    console.warn(
      `Token ${upperSymbol} already exists. Updating configuration.`
    );
  }

  SUPPORTED_TOKENS[upperSymbol] = {
    symbol: upperSymbol,
    name,
    address,
    decimals,
    isNative: false,
    enabled,
  };

  console.log(`✅ Token ${upperSymbol} (${name}) added successfully`);
}

/**
 * Enable or disable a token
 * @param symbol Token symbol
 * @param enabled Whether to enable or disable the token
 */
export function toggleToken(symbol: string, enabled: boolean): void {
  const upperSymbol = symbol.toUpperCase();

  if (!SUPPORTED_TOKENS[upperSymbol]) {
    throw new Error(`Token ${upperSymbol} not found`);
  }

  SUPPORTED_TOKENS[upperSymbol].enabled = enabled;
  console.log(`✅ Token ${upperSymbol} ${enabled ? "enabled" : "disabled"}`);
}

/**
 * Get all enabled tokens
 */
export function getEnabledTokens(): Record<string, TokenConfig> {
  return Object.fromEntries(
    Object.entries(SUPPORTED_TOKENS).filter(([_, config]) => config.enabled)
  );
}

/**
 * Get token configuration by symbol
 * @param symbol Token symbol
 */
export function getTokenConfig(symbol: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
}

/**
 * Check if a token is supported and enabled
 * @param symbol Token symbol
 */
export function isTokenSupported(symbol: string): boolean {
  const config = getTokenConfig(symbol);
  return config !== undefined && config.enabled;
}

/**
 * Get list of supported token symbols
 */
export function getSupportedTokenSymbols(): string[] {
  return Object.keys(getEnabledTokens());
}
