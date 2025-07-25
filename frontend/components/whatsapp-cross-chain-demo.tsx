"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRightLeft, Zap, Globe } from "lucide-react";

interface CrossChainMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  hasEmoji?: boolean;
  isTyping?: boolean;
}

export function WhatsAppCrossChainDemo() {
  const [messages, setMessages] = useState<CrossChainMessage[]>([
    {
      id: 1,
      text: "Hey! I'm your cross-chain crypto assistant 🌐\n\nI can help you:\n🔄 Swap tokens across 20+ chains\n🌉 Bridge assets between networks\n⚡ Execute complex DeFi zaps\n💰 Find the best rates automatically\n\nPowered by LiFi Protocol for seamless cross-chain magic! ✨",
      isUser: false,
      timestamp: new Date(Date.now() - 300000),
      hasEmoji: true,
    },
  ]);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const crossChainScenarios = [
    {
      title: "Cross-Chain Swap",
      icon: ArrowRightLeft,
      steps: [
        { text: "I want to swap my ETH for SOL", isUser: true },
        {
          text: "Perfect! I'll help you swap ETH to SOL across chains 🔄\n\nHow much ETH would you like to swap?",
          isUser: false,
          hasEmoji: true,
        },
        { text: "0.5 ETH", isUser: true },
        {
          text: "Great choice! Here's the best route I found:\n\n💰 0.5 ETH (Ethereum)\n🔄 → 3.52 SOL (Solana)\n💵 Rate: 1 ETH = 7.04 SOL\n⚡ Route: Ethereum → Wormhole → Solana\n💸 Total fee: $2.15\n⏱️ Est. time: 2-3 minutes\n\nThis is the best rate across all DEXs! Proceed? 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Yes, let's do it!", isUser: true },
        {
          text: "🎉 Swap initiated!\n\n✅ Step 1: Swapping ETH on Ethereum... Done!\n✅ Step 2: Bridging via Wormhole... Done!\n✅ Step 3: Receiving SOL on Solana... Done!\n\n🎊 Success! You now have 3.52 SOL in your wallet!\n📋 Transaction: sol_tx_abc123\n\nAnything else I can help with?",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Bridge Assets",
      icon: Globe,
      steps: [
        {
          text: "Can you bridge my USDC from Polygon to Arbitrum?",
          isUser: true,
        },
        {
          text: "I'll bridge your USDC from Polygon to Arbitrum 🌉\n\nHow much USDC would you like to bridge?",
          isUser: false,
          hasEmoji: true,
        },
        { text: "200 USDC", isUser: true },
        {
          text: "Perfect! Here's your bridge route:\n\n💰 200 USDC (Polygon)\n🌉 → 200 USDC (Arbitrum)\n⚡ Bridge: Stargate Finance\n💸 Fee: $0.85\n⏱️ Time: ~45 seconds\n🛡️ Insured by Nexus Mutual\n\nThis is the fastest and cheapest route! Ready to bridge? 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Yes, bridge it", isUser: true },
        {
          text: "🌉 Bridging in progress...\n\n✅ Locked 200 USDC on Polygon\n✅ Stargate bridge processing...\n✅ 200 USDC unlocked on Arbitrum!\n\n🎉 Bridge complete! Your USDC is now on Arbitrum and ready to use!\n📋 Bridge TX: arb_bridge_xyz789\n\nWant to stake it on Arbitrum for 12% APY? 📈",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Smart Zap",
      icon: Zap,
      steps: [
        { text: "I want to stake ETH but on a cheaper chain", isUser: true },
        {
          text: "Smart thinking! I can zap your ETH to cheaper staking in one transaction ⚡\n\nI recommend Arbitrum - same security, 90% lower fees!\n\nHow much ETH would you like to zap-stake?",
          isUser: false,
          hasEmoji: true,
        },
        { text: "1 ETH", isUser: true },
        {
          text: "Excellent! Here's your smart zap:\n\n⚡ Smart Zap Route:\n1️⃣ Bridge 1 ETH: Ethereum → Arbitrum\n2️⃣ Stake ETH on Arbitrum (12.5% APY)\n\n💰 You'll earn ~$125/year vs $25 in fees on Ethereum!\n💸 Total zap fee: $3.20\n⏱️ Complete in one transaction, ~2 minutes\n\nReady to zap? This will save you hundreds in gas! 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Amazing! Do the zap", isUser: true },
        {
          text: "⚡ Zap magic happening...\n\n✅ Bridged 1 ETH to Arbitrum\n✅ Staked ETH in Lido on Arbitrum\n✅ You're now earning 12.5% APY!\n\n🎊 Zap complete! You're earning ~$0.34/day!\n📈 Your stETH is already growing\n💰 Annual earnings: ~$125\n\nYou just saved $200+ in gas fees! Smart move! 🧠✨",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Best Rate Finding",
      icon: ArrowRightLeft,
      steps: [
        {
          text: "Find me the best rate to swap 1000 USDC to AVAX",
          isUser: true,
        },
        {
          text: "I'm scanning 500+ DEXs across all chains for the best USDC → AVAX rate! 🔍\n\n⏳ Checking rates on:\n• Ethereum DEXs\n• Avalanche DEXs  \n• Cross-chain routes\n• Bridge combinations\n\nGive me 3 seconds to find you the absolute best deal... 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Take your time!", isUser: true },
        {
          text: "🎯 Found the BEST rate!\n\n🥇 Winner: Cross-chain route\n💰 1000 USDC → 28.47 AVAX\n📍 Route: Ethereum → Avalanche\n🔄 Via: 1inch + Stargate Bridge\n💸 Total fee: $4.20\n⏱️ Time: 90 seconds\n\n🆚 Beat direct Avalanche DEX by 2.3%!\n💡 You save $12.50 vs other routes\n\nThis is the absolute best rate available! Swap now? 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Perfect! Execute the swap", isUser: true },
        {
          text: "🎯 Executing best-rate swap!\n\n✅ Swapped USDC on Ethereum (1inch)\n✅ Bridged to Avalanche (Stargate)\n✅ Received 28.47 AVAX!\n\n🏆 Swap complete with BEST rate!\n💰 You got 0.65 more AVAX than average\n📋 TX: avax_swap_best_123\n\nI always find you the best deals! 😎✨",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
  ];

  const playDemo = async (scenarioIndex: number) => {
    setIsPlaying(true);
    setCurrentDemo(scenarioIndex);

    // Reset to welcome message
    setMessages([
      {
        id: 1,
        text: "Hey! I'm your cross-chain crypto assistant 🌐\n\nI can help you:\n🔄 Swap tokens across 20+ chains\n🌉 Bridge assets between networks\n⚡ Execute complex DeFi zaps\n💰 Find the best rates automatically\n\nPowered by LiFi Protocol for seamless cross-chain magic! ✨",
        isUser: false,
        timestamp: new Date(Date.now() - 300000),
        hasEmoji: true,
      },
    ]);

    const scenario = crossChainScenarios[scenarioIndex];

    for (let i = 0; i < scenario.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Show typing indicator for AI responses
      if (!scenario.steps[i].isUser && i > 0) {
        const typingMessage: CrossChainMessage = {
          id: Date.now() + i - 0.5,
          text: "Zest AI is analyzing cross-chain routes...",
          isUser: false,
          timestamp: new Date(),
          isTyping: true,
        };
        setMessages((prev) => [...prev, typingMessage]);

        await new Promise((resolve) => setTimeout(resolve, 1800));

        // Remove typing indicator
        setMessages((prev) => prev.filter((msg) => !msg.isTyping));
      }

      const newMessage: CrossChainMessage = {
        id: Date.now() + i,
        text: scenario.steps[i].text,
        isUser: scenario.steps[i].isUser,
        timestamp: new Date(),
        hasEmoji: scenario.steps[i].hasEmoji,
      };

      setMessages((prev) => [...prev, newMessage]);
    }

    setIsPlaying(false);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              Cross-Chain AI in Action
            </h2>
            <p className="text-lg text-muted-foreground">
              Experience how our AI handles complex cross-chain operations
              through simple WhatsApp conversations
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Demo Controls */}
            <div>
              <h3 className="text-xl font-medium text-foreground mb-6">
                Try Cross-Chain Scenarios
              </h3>
              <div className="space-y-4">
                {crossChainScenarios.map((scenario, index) => (
                  <Button
                    key={index}
                    onClick={() => playDemo(index)}
                    disabled={isPlaying}
                    className={`w-full justify-start p-4 h-auto ${
                      currentDemo === index && !isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground border border-border hover:bg-muted"
                    }`}>
                    <scenario.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{scenario.title}</div>
                      <div className="text-sm opacity-75 mt-1">
                        {scenario.title === "Cross-Chain Swap" &&
                          "Swap tokens across different blockchains"}
                        {scenario.title === "Bridge Assets" &&
                          "Move assets between networks securely"}
                        {scenario.title === "Smart Zap" &&
                          "Complex DeFi operations in one transaction"}
                        {scenario.title === "Best Rate Finding" &&
                          "AI finds optimal rates across 500+ DEXs"}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="mt-8 p-6 bg-card rounded-lg border border-border shadow-sm">
                <h4 className="font-medium text-foreground mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary" />
                  LiFi Protocol Integration
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Access to 20+ blockchains including Ethereum, Solana,
                    Polygon, Arbitrum
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    500+ DEXs aggregated for best rates and liquidity
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    15+ battle-tested bridges with insurance coverage
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Smart routing algorithms minimize fees and time
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    One-click zaps for complex DeFi strategies
                  </li>
                </ul>
              </div>
            </div>

            {/* WhatsApp Interface */}
            <div>
              <Card className="bg-card shadow-2xl border border-border">
                <div className="bg-primary dark:bg-slate-800 p-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-foreground dark:bg-white rounded-full flex items-center justify-center mr-3">
                        <ArrowRightLeft className="w-6 h-6 text-primary dark:text-slate-800" />
                      </div>
                      <div>
                        <div className="font-medium text-primary-foreground dark:text-white">
                          Zest Cross-Chain AI
                        </div>
                        <div className="text-xs text-primary-foreground/80 dark:text-white/80">
                          Powered by LiFi Protocol
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-primary-foreground/80 dark:text-white/80 bg-primary-foreground/20 dark:bg-white/20 px-2 py-1 rounded-full">
                      20+ Chains
                    </div>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="h-96 overflow-y-auto p-4 space-y-4 bg-muted">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isUser ? "justify-end" : "justify-start"
                        } animate-fade-in`}>
                        <div
                          className={`max-w-[85%] p-3 rounded-lg ${
                            message.isUser
                              ? "bg-primary dark:bg-slate-800 text-primary-foreground dark:text-white rounded-br-sm"
                              : message.isTyping
                              ? "bg-muted text-muted-foreground animate-pulse"
                              : "bg-card text-card-foreground border border-border rounded-bl-sm shadow-sm"
                          }`}>
                          <p className="text-sm whitespace-pre-line">
                            {message.text}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-75">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {message.isUser && (
                              <span className="text-xs opacity-75">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isPlaying && (
                      <div className="flex justify-center">
                        <div className="bg-card border border-border text-card-foreground px-4 py-2 rounded-full text-sm animate-pulse">
                          Cross-chain demo in progress...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Ready for cross-chain magic?
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() =>
                    window.open(
                      "https://wa.me/+1415523-8886?text=Swap ETH to SOL",
                      "_blank"
                    )
                  }>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Cross-Chain Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </section>
  );
}
