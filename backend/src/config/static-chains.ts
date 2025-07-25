import { LiFiChain } from "../types";

/**
 * Static chain data to avoid API calls
 * This data is based on commonly supported chains by LI.FI
 */
export const STATIC_CHAINS: LiFiChain[] = [
  {
    id: 1,
    key: "eth",
    name: "Ethereum",
    coin: "ETH",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    tokenlistUrl: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0x1",
      blockExplorerUrls: ["https://etherscan.io"],
      chainName: "Ethereum Mainnet",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://mainnet.infura.io/v3/"],
    },
  },
  {
    id: 137,
    key: "pol",
    name: "Polygon",
    coin: "MATIC",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
    tokenlistUrl:
      "https://unpkg.com/quickswap-default-token-list@1.0.71/build/quickswap-default.tokenlist.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0x89",
      blockExplorerUrls: ["https://polygonscan.com"],
      chainName: "Polygon Mainnet",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      rpcUrls: ["https://polygon-rpc.com"],
    },
  },
  {
    id: 56,
    key: "bsc",
    name: "BNB Smart Chain",
    coin: "BNB",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
    tokenlistUrl:
      "https://tokens.pancakeswap.finance/pancakeswap-extended.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0x38",
      blockExplorerUrls: ["https://bscscan.com"],
      chainName: "BNB Smart Chain Mainnet",
      nativeCurrency: {
        name: "BNB",
        symbol: "BNB",
        decimals: 18,
      },
      rpcUrls: ["https://bsc-dataseed.binance.org"],
    },
  },
  {
    id: 42161,
    key: "arb",
    name: "Arbitrum One",
    coin: "ETH",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
    tokenlistUrl: "https://bridge.arbitrum.io/token-list-42161.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0xa4b1",
      blockExplorerUrls: ["https://arbiscan.io"],
      chainName: "Arbitrum One",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    },
  },
  {
    id: 10,
    key: "opt",
    name: "Optimism",
    coin: "ETH",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
    tokenlistUrl: "https://static.optimism.io/optimism.tokenlist.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0xa",
      blockExplorerUrls: ["https://optimistic.etherscan.io"],
      chainName: "Optimism",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://mainnet.optimism.io"],
    },
  },
  {
    id: 43114,
    key: "ava",
    name: "Avalanche",
    coin: "AVAX",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
    tokenlistUrl:
      "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/joe.tokenlist.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0xa86a",
      blockExplorerUrls: ["https://snowtrace.io"],
      chainName: "Avalanche Network",
      nativeCurrency: {
        name: "Avalanche",
        symbol: "AVAX",
        decimals: 18,
      },
      rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    },
  },
  {
    id: 250,
    key: "ftm",
    name: "Fantom",
    coin: "FTM",
    mainnet: true,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
    tokenlistUrl:
      "https://raw.githubusercontent.com/SpookySwap/spooky-info/master/src/constants/token/spookyswap.json",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0xfa",
      blockExplorerUrls: ["https://ftmscan.com"],
      chainName: "Fantom Opera",
      nativeCurrency: {
        name: "Fantom",
        symbol: "FTM",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.ftm.tools"],
    },
  },
  {
    id: 5000,
    key: "mnt",
    name: "Mantle",
    coin: "MNT",
    mainnet: true,
    logoURI: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg",
    tokenlistUrl: "",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0x1388",
      blockExplorerUrls: ["https://explorer.mantle.xyz"],
      chainName: "Mantle",
      nativeCurrency: {
        name: "Mantle",
        symbol: "MNT",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.mantle.xyz"],
    },
  },
  {
    id: 5003,
    key: "mnt-testnet",
    name: "Mantle Sepolia",
    coin: "MNT",
    mainnet: false,
    logoURI: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg",
    tokenlistUrl: "",
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    metamask: {
      chainId: "0x138b",
      blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"],
      chainName: "Mantle Sepolia Testnet",
      nativeCurrency: {
        name: "Mantle",
        symbol: "MNT",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
];

/**
 * Get static chain data by ID
 */
export function getStaticChainById(chainId: number): LiFiChain | null {
  return STATIC_CHAINS.find((chain) => chain.id === chainId) || null;
}

/**
 * Get all static supported chains
 */
export function getStaticSupportedChains(): LiFiChain[] {
  return STATIC_CHAINS.filter((chain) => {
    // Only return chains that are in our supported list
    const supportedIds = [1, 137, 56, 42161, 10, 43114, 250, 5000, 5003];
    return supportedIds.includes(chain.id);
  });
}

/**
 * Check if chain exists in static data
 */
export function isStaticChainSupported(chainId: number): boolean {
  return STATIC_CHAINS.some((chain) => chain.id === chainId);
}
