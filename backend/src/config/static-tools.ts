/**
 * Static tools data to avoid API calls
 * This includes commonly used bridges and exchanges supported by LI.FI
 */
export const STATIC_TOOLS = {
  bridges: [
    {
      key: "stargate",
      name: "Stargate",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/stargate.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    },
    {
      key: "hop",
      name: "Hop Protocol",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/hop.png",
      supportedChains: [1, 137, 42161, 10]
    },
    {
      key: "across",
      name: "Across",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/across.png",
      supportedChains: [1, 137, 42161, 10]
    },
    {
      key: "cbridge",
      name: "Celer cBridge",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/cbridge.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    },
    {
      key: "multichain",
      name: "Multichain",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/multichain.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    },
    {
      key: "synapse",
      name: "Synapse",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/synapse.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    }
  ],
  exchanges: [
    {
      key: "1inch",
      name: "1inch",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/1inch.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    },
    {
      key: "uniswap",
      name: "Uniswap",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/uniswap.png",
      supportedChains: [1, 137, 42161, 10]
    },
    {
      key: "sushiswap",
      name: "SushiSwap",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/sushiswap.png",
      supportedChains: [1, 137, 56, 42161, 10, 43114, 250]
    },
    {
      key: "pancakeswap",
      name: "PancakeSwap",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/pancakeswap.png",
      supportedChains: [56]
    },
    {
      key: "quickswap",
      name: "QuickSwap",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/quickswap.png",
      supportedChains: [137]
    },
    {
      key: "traderjoe",
      name: "Trader Joe",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/traderjoe.png",
      supportedChains: [43114]
    },
    {
      key: "spookyswap",
      name: "SpookySwap",
      logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/spookyswap.png",
      supportedChains: [250]
    }
  ]
};

/**
 * Get static tools data
 */
export function getStaticTools() {
  return STATIC_TOOLS;
}

/**
 * Get bridges for a specific chain
 */
export function getBridgesForChain(chainId: number) {
  return STATIC_TOOLS.bridges.filter(bridge => 
    bridge.supportedChains.includes(chainId)
  );
}

/**
 * Get exchanges for a specific chain
 */
export function getExchangesForChain(chainId: number) {
  return STATIC_TOOLS.exchanges.filter(exchange => 
    exchange.supportedChains.includes(chainId)
  );
}

/**
 * Check if a bridge is supported for a chain
 */
export function isBridgeSupported(bridgeKey: string, chainId: number): boolean {
  const bridge = STATIC_TOOLS.bridges.find(b => b.key === bridgeKey);
  return bridge ? bridge.supportedChains.includes(chainId) : false;
}

/**
 * Check if an exchange is supported for a chain
 */
export function isExchangeSupported(exchangeKey: string, chainId: number): boolean {
  const exchange = STATIC_TOOLS.exchanges.find(e => e.key === exchangeKey);
  return exchange ? exchange.supportedChains.includes(chainId) : false;
}