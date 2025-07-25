import { ethers } from "ethers";
import { env } from "../config/env";
import { DatabaseService } from "./database.service";
import { Transaction } from "../types";
import {
  getTokenConfig,
  isTokenSupported,
  getSupportedTokenSymbols,
} from "../config/tokens";
import { transactionHistoryService } from "./transaction-history.service";

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private relayerWallet: ethers.Wallet;
  private dbService: DatabaseService;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.MANTLE_RPC_URL);
    this.relayerWallet = new ethers.Wallet(
      env.RELAYER_PRIVATE_KEY,
      this.provider
    );
    this.dbService = new DatabaseService();

    console.log(
      `✅ Blockchain service initialized with relayer: ${this.relayerWallet.address}`
    );
  }

  /**
   * Get MNT balance for a wallet address
   */
  async getMNTBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Error getting MNT balance for ${address}:`, error);
      throw new Error("Failed to get MNT balance");
    }
  }

  /**
   * Get ERC-20 token balance (e.g., USDC)
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string
  ): Promise<string> {
    try {
      const tokenABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenABI,
        this.provider
      );
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error(`Error getting token balance for ${walletAddress}:`, error);
      throw new Error("Failed to get token balance");
    }
  }

  /**
   * Transfer MNT tokens with relayer paying gas fees
   */
  async transferMNT(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
    senderPhone: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    let transactionHistoryId: string | undefined;

    try {
      const fromWallet = new ethers.Wallet(fromPrivateKey, this.provider);
      const amountWei = ethers.parseEther(amount);

      // Check sender's MNT balance
      const senderBalance = await this.provider.getBalance(fromWallet.address);
      if (senderBalance < amountWei) {
        return {
          success: false,
          message: `Insufficient MNT balance. You have ${ethers.formatEther(
            senderBalance
          )} MNT, but tried to send ${amount} MNT.`,
        };
      }

      // Estimate gas for the transaction
      const gasEstimate = await this.provider.estimateGas({
        from: fromWallet.address,
        to: toAddress,
        value: amountWei,
      });

      const gasPrice = await this.provider.getFeeData();
      const gasCost =
        gasEstimate * (gasPrice.gasPrice || ethers.parseUnits("20", "gwei"));

      // Check if relayer has enough MNT for gas
      const relayerBalance = await this.provider.getBalance(
        this.relayerWallet.address
      );
      if (relayerBalance < gasCost) {
        console.error(
          `Relayer insufficient balance. Has: ${ethers.formatEther(
            relayerBalance
          )} MNT, needs: ${ethers.formatEther(gasCost)} MNT for gas`
        );
        return {
          success: false,
          message: "System temporarily unavailable. Please try again later.",
        };
      }

      // Create transaction ID
      const txId = ethers.keccak256(
        ethers.toUtf8Bytes(
          `${fromWallet.address}-${toAddress}-${amount}-${Date.now()}`
        )
      );

      // Create transaction record
      const transaction: Transaction = {
        txId,
        sender: senderPhone,
        recipient: recipientPhone || toAddress,
        amount: parseFloat(amount),
        token: "MNT",
        status: "pending",
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Save transaction to history
      transactionHistoryId =
        await transactionHistoryService.createTransferTransaction(
          senderPhone,
          fromWallet.address,
          toAddress,
          amount,
          "MNT",
          env.MANTLE_CHAIN_ID,
          "whatsapp",
          recipientPhone
        );

      // Execute the transfer from user's wallet with relayer paying gas
      // Note: In a production system, this would require a meta-transaction or relayer pattern
      // For now, we'll use a simple approach where relayer covers gas by sending gas to user first

      // Check if user has enough gas for the transaction
      const userGasBalance = await this.provider.getBalance(fromWallet.address);
      const requiredGas = gasCost + amountWei;

      if (userGasBalance < requiredGas) {
        // Send gas from relayer to user
        const gasTransfer = await this.relayerWallet.sendTransaction({
          to: fromWallet.address,
          value: gasCost,
          gasLimit: 100000000, // Increased gas limit to handle high gas requirements
        });
        await gasTransfer.wait();
        console.log(`✅ Gas transferred to user: ${gasTransfer.hash}`);
      }

      // Now execute the actual transfer from user's wallet
      const tx = await fromWallet.sendTransaction({
        to: toAddress,
        value: amountWei,
        gasLimit: gasEstimate,
        gasPrice: gasPrice.gasPrice,
      });

      console.log(`✅ MNT transfer initiated: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        transaction.status = "completed";

        // Update transaction history with success
        await transactionHistoryService.updateTransactionHash(
          transactionHistoryId,
          tx.hash,
          receipt.blockNumber
        );
        await transactionHistoryService.markTransactionCompleted(
          transactionHistoryId
        );

        console.log(`✅ MNT transfer completed: ${tx.hash}`);
        return {
          success: true,
          txHash: tx.hash,
          message: `Successfully transferred ${amount} MNT to ${toAddress}`,
          transaction,
        };
      } else {
        transaction.status = "failed";

        // Update transaction history with failure
        await transactionHistoryService.markTransactionFailed(
          transactionHistoryId,
          "Transaction failed during execution"
        );

        return {
          success: false,
          message: "Transaction failed during execution",
          transaction,
        };
      }
    } catch (error) {
      console.error("Error transferring MNT:", error);

      // Mark transaction as failed if it was created
      if (transactionHistoryId) {
        await transactionHistoryService.markTransactionFailed(
          transactionHistoryId,
          `Transfer failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      return {
        success: false,
        message: "Failed to transfer MNT. Please try again later.",
      };
    }
  }

  /**
   * Transfer ERC-20 tokens (e.g., USDC) with relayer paying gas fees
   */
  async transferToken(
    tokenAddress: string,
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
    senderPhone: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    let transactionHistoryId: string | undefined;

    try {
      const fromWallet = new ethers.Wallet(fromPrivateKey, this.provider);

      const tokenABI = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ];

      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenABI,
        this.provider
      );

      // Get token details
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();
      const amountWei = ethers.parseUnits(amount, decimals);

      // Check sender's token balance
      const senderBalance = await tokenContract.balanceOf(fromWallet.address);
      if (senderBalance < amountWei) {
        const balanceFormatted = ethers.formatUnits(senderBalance, decimals);
        return {
          success: false,
          message: `Insufficient ${symbol} balance. You have ${balanceFormatted} ${symbol}, but tried to send ${amount} ${symbol}.`,
        };
      }

      // Estimate gas for token transfer
      const gasEstimate = await tokenContract
        .getFunction("transfer")
        .estimateGas(toAddress, amountWei);
      const gasPrice = await this.provider.getFeeData();
      const gasCost =
        gasEstimate * (gasPrice.gasPrice || ethers.parseUnits("20", "gwei"));

      // Check if relayer has enough MNT for gas
      const relayerBalance = await this.provider.getBalance(
        this.relayerWallet.address
      );
      if (relayerBalance < gasCost) {
        console.error(
          `Relayer insufficient balance for gas. Has: ${ethers.formatEther(
            relayerBalance
          )} MNT, needs: ${ethers.formatEther(gasCost)} MNT`
        );
        return {
          success: false,
          message: "System temporarily unavailable. Please try again later.",
        };
      }

      // Create transaction ID
      const txId = ethers.keccak256(
        ethers.toUtf8Bytes(
          `${fromWallet.address}-${toAddress}-${amount}-${symbol}-${Date.now()}`
        )
      );

      // Save transaction to history
      transactionHistoryId =
        await transactionHistoryService.createTransferTransaction(
          senderPhone,
          fromWallet.address,
          toAddress,
          amount,
          symbol,
          env.MANTLE_CHAIN_ID,
          "whatsapp",
          recipientPhone
        );

      // Create transaction record
      const transaction: Transaction = {
        txId,
        sender: senderPhone,
        recipient: recipientPhone || toAddress,
        amount: parseFloat(amount),
        token: symbol,
        status: "pending",
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Check if user has enough gas for the transaction
      const userGasBalance = await this.provider.getBalance(fromWallet.address);

      if (userGasBalance < gasCost) {
        // Send gas from relayer to user
        const gasTransfer = await this.relayerWallet.sendTransaction({
          to: fromWallet.address,
          value: gasCost,
          gasLimit: 100000000, // Increased gas limit to handle high gas requirements
        });
        await gasTransfer.wait();
        console.log(
          `✅ Gas transferred to user for token transfer: ${gasTransfer.hash}`
        );
      }

      // Connect token contract with user's wallet
      const tokenContractWithUser = tokenContract.connect(fromWallet);

      // Execute the token transfer from user's wallet
      const tx = await tokenContractWithUser.getFunction("transfer")(
        toAddress,
        amountWei,
        {
          gasLimit: gasEstimate,
          gasPrice: gasPrice.gasPrice,
        }
      );

      console.log(`✅ ${symbol} transfer initiated: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        transaction.status = "completed";

        // Update transaction history with success
        await transactionHistoryService.updateTransactionHash(
          transactionHistoryId,
          tx.hash,
          receipt.blockNumber
        );
        await transactionHistoryService.markTransactionCompleted(
          transactionHistoryId
        );

        console.log(`✅ ${symbol} transfer completed: ${tx.hash}`);
        return {
          success: true,
          txHash: tx.hash,
          message: `Successfully transferred ${amount} ${symbol} to ${toAddress}`,
          transaction,
        };
      } else {
        transaction.status = "failed";

        // Update transaction history with failure
        await transactionHistoryService.markTransactionFailed(
          transactionHistoryId,
          "Transaction failed during execution"
        );

        return {
          success: false,
          message: "Transaction failed during execution",
          transaction,
        };
      }
    } catch (error) {
      console.error("Error transferring token:", error);

      // Mark transaction as failed if it was created
      if (transactionHistoryId) {
        await transactionHistoryService.markTransactionFailed(
          transactionHistoryId,
          `Transfer failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      return {
        success: false,
        message: "Failed to transfer token. Please try again later.",
      };
    }
  }

  /**
   * Get comprehensive wallet balances for all supported tokens
   */
  async getWalletBalances(
    address: string
  ): Promise<Record<string, string> & { address: string }> {
    try {
      const balances: Record<string, string> = {};
      const supportedTokens = getSupportedTokenSymbols();

      for (const symbol of supportedTokens) {
        const tokenConfig = getTokenConfig(symbol);
        if (!tokenConfig) continue;

        try {
          if (tokenConfig.isNative) {
            // Handle native token (MNT)
            balances[symbol.toLowerCase()] = await this.getMNTBalance(address);
          } else {
            // Handle ERC-20 tokens
            balances[symbol.toLowerCase()] = await this.getTokenBalance(
              tokenConfig.address,
              address
            );
          }
        } catch (error) {
          console.warn(
            `Failed to get ${symbol} balance for ${address}:`,
            error
          );
          balances[symbol.toLowerCase()] = "0";
        }
      }

      return {
        ...balances,
        address,
      };
    } catch (error) {
      console.error(`Error getting wallet balances for ${address}:`, error);
      // Return default balances for all supported tokens
      const defaultBalances: Record<string, string> = {};
      getSupportedTokenSymbols().forEach((symbol) => {
        defaultBalances[symbol.toLowerCase()] = "0";
      });
      return {
        ...defaultBalances,
        address,
      };
    }
  }

  /**
   * Transfer any supported token with relayer paying gas fees
   */
  async transferSupportedToken(
    tokenSymbol: string,
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
    senderPhone: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    try {
      const upperSymbol = tokenSymbol.toUpperCase();

      // Check if token is supported
      if (!isTokenSupported(upperSymbol)) {
        const supportedTokens = getSupportedTokenSymbols().join(", ");
        return {
          success: false,
          message: `Token ${upperSymbol} is not supported. Supported tokens: ${supportedTokens}`,
        };
      }

      const tokenConfig = getTokenConfig(upperSymbol);
      if (!tokenConfig) {
        return {
          success: false,
          message: `Token configuration not found for ${upperSymbol}`,
        };
      }

      // Use appropriate transfer method based on token type
      if (tokenConfig.isNative) {
        return await this.transferMNT(
          fromPrivateKey,
          toAddress,
          amount,
          senderPhone,
          recipientPhone
        );
      } else {
        return await this.transferToken(
          tokenConfig.address,
          fromPrivateKey,
          toAddress,
          amount,
          senderPhone,
          recipientPhone
        );
      }
    } catch (error) {
      console.error(`Error transferring ${tokenSymbol}:`, error);
      return {
        success: false,
        message: `Failed to transfer ${tokenSymbol}. Please try again later.`,
      };
    }
  }

  /**
   * Check if an address is valid
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    txHash: string
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error(`Error getting transaction receipt for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return ethers.formatUnits(
        feeData.gasPrice || ethers.parseUnits("20", "gwei"),
        "gwei"
      );
    } catch (error) {
      console.error("Error getting gas price:", error);
      return "20"; // Default fallback
    }
  }

  /**
   * Get relayer balance (for monitoring)
   */
  async getRelayerBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(
        this.relayerWallet.address
      );
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting relayer balance:", error);
      throw new Error("Failed to get relayer balance");
    }
  }
}

export const blockchainService = new BlockchainService();
