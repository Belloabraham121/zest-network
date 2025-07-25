import { env } from "./env";

/**
 * Supported chain IDs and keys for Zest Network
 * Using number type to support both official and testnet chains
 */
export type SupportedChain = number | string;

/**
 * LI.FI Configuration Interface
 */
export interface LiFiConfig {
  apiUrl: string;
  integrator: string;
  apiKey?: string;
  slippageTolerance: number;
  enableSimulation: boolean;
  cacheTtl: number;
  supportedChains: SupportedChain[];
  defaultGasMultiplier: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Default supported chains for Zest Network
 * Initially focusing on major chains with good liquidity
 */
const DEFAULT_SUPPORTED_CHAINS: SupportedChain[] = [
  1, // Ethereum Mainnet
  137, // Polygon
  56, // BSC
  42161, // Arbitrum One
  10, // Optimism
  43114, // Avalanche
  250, // Fantom
  5000, // Mantle Mainnet
  5003, // Mantle Sepolia (testnet)
];

/**
 * LI.FI Configuration Object
 */
export const lifiConfig: LiFiConfig = {
  apiUrl: env.LIFI_API_URL,
  integrator: env.LIFI_INTEGRATOR,
  apiKey: env.LIFI_API_KEY,
  slippageTolerance: env.LIFI_SLIPPAGE_TOLERANCE,
  enableSimulation: env.LIFI_ENABLE_SIMULATION,
  cacheTtl: env.LIFI_CACHE_TTL,
  supportedChains: DEFAULT_SUPPORTED_CHAINS,
  defaultGasMultiplier: 1.2, // 20% gas buffer
  maxRetries: 4,
  retryDelay: 2000, // 2 seconds
};

/**
 * Validate LI.FI configuration
 */
export function validateLiFiConfig(): void {
  const requiredFields = ["apiUrl", "integrator"];

  for (const field of requiredFields) {
    if (!lifiConfig[field as keyof LiFiConfig]) {
      throw new Error(`LI.FI configuration missing required field: ${field}`);
    }
  }

  if (lifiConfig.slippageTolerance < 0 || lifiConfig.slippageTolerance > 1) {
    throw new Error("LI.FI slippage tolerance must be between 0 and 1");
  }

  if (lifiConfig.cacheTtl < 0) {
    throw new Error("LI.FI cache TTL must be non-negative");
  }

  console.log("✅ LI.FI configuration validated successfully");
}

/**
 * Get chain configuration for LI.FI
 */
export function getChainConfig(chainId: SupportedChain) {
  return {
    chainId,
    gasMultiplier: lifiConfig.defaultGasMultiplier,
    slippageTolerance: lifiConfig.slippageTolerance,
  };
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: SupportedChain): boolean {
  return lifiConfig.supportedChains.includes(chainId);
}

/**
 * Get request options for LI.FI API calls
 */
export function getLiFiRequestOptions() {
  const options: any = {
    integrator: lifiConfig.integrator,
  };

  if (lifiConfig.apiKey) {
    options.apiKey = lifiConfig.apiKey;
  }

  return options;
}
