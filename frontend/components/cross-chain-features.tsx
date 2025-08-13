"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  Zap,
  Globe,
  TrendingUp,
  Shield,
  Clock,
} from "lucide-react";

export function CrossChainFeatures() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeChain, setActiveChain] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const supportedChains = [
    {
      name: "Morph",
      symbol: "MORPH",
      color: "bg-gradient-to-r from-blue-500 to-purple-500",
      logo: "🦋",
    },
    { name: "Ethereum", symbol: "ETH", color: "bg-blue-500", logo: "🔷" },
    { name: "Polygon", symbol: "MATIC", color: "bg-purple-500", logo: "🟣" },
    { name: "Arbitrum", symbol: "ARB", color: "bg-blue-400", logo: "🔵" },
    { name: "Optimism", symbol: "OP", color: "bg-red-500", logo: "🔴" },
    { name: "Base", symbol: "BASE", color: "bg-blue-600", logo: "🔷" },
    {
      name: "Solana",
      symbol: "SOL",
      color: "bg-gradient-to-r from-purple-400 to-pink-400",
      logo: "🌟",
    },
    { name: "Avalanche", symbol: "AVAX", color: "bg-red-600", logo: "🔺" },
    { name: "BNB Chain", symbol: "BNB", color: "bg-yellow-500", logo: "🟡" },
  ];

  const crossChainFeatures = [
    {
      icon: ArrowRightLeft,
      title: "Cross-Chain Swaps",
      description:
        "Swap any token across 20+ blockchains with best rates via LiFi aggregation",
      example: "Swap ETH on Ethereum → SOL on Solana",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      icon: Globe,
      title: "Universal Bridging",
      description:
        "Bridge assets seamlessly between EVM chains and Solana with automatic routing",
      example: "Bridge USDC from Polygon → Base",
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      icon: Zap,
      title: "Smart Zaps",
      description:
        "One-click complex DeFi operations across chains - stake, LP, yield farm in one transaction",
      example: "Zap ETH → Stake on Arbitrum in one step",
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      icon: TrendingUp,
      title: "Best Rate Routing",
      description:
        "AI finds optimal routes across DEXs and bridges for maximum value and minimal fees",
      example: "Save 15% on swaps with smart routing",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      icon: Shield,
      title: "Secure Protocols",
      description:
        "Built on battle-tested bridges and DEXs with insurance coverage for peace of mind",
      example: "Protected by Nexus Mutual insurance",
      color: "text-red-500 bg-red-500/10",
    },
    {
      icon: Clock,
      title: "Fast Execution",
      description:
        "Most swaps complete in under 30 seconds, bridges in 2-5 minutes depending on chains",
      example: "Polygon → Arbitrum in 2 minutes",
      color: "text-teal-500 bg-teal-500/10",
    },
  ];

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveChain((prev) => (prev + 1) % supportedChains.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible, supportedChains.length]);

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-gradient-to-b from-background via-background to-background/95 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-60 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/5 via-purple-900/5 to-blue-900/5"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Animated chain connections background */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 1000 600">
          <defs>
            <pattern
              id="grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Animated connection lines */}
          <g className="animate-pulse-slow">
            <line
              x1="100"
              y1="100"
              x2="900"
              y2="100"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="100"
              y1="300"
              x2="900"
              y2="300"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="100"
              y1="500"
              x2="900"
              y2="500"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="200"
              y1="50"
              x2="200"
              y2="550"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="500"
              y1="50"
              x2="500"
              y2="550"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="800"
              y1="50"
              x2="800"
              y2="550"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </g>
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center animate-pulse-gentle">
                <ArrowRightLeft className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              Cross-Chain DeFi Made Simple
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Powered by LiFi Protocol - swap, bridge, and zap across 20+
              blockchains with a simple WhatsApp message. No complex interfaces,
              just natural conversation.
            </p>
          </div>

          {/* Supported Chains Visualization */}
          <div
            className={`mb-16 transition-all duration-1000 ease-out delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h3 className="text-xl font-medium text-foreground text-center mb-8">
              Supported Networks
            </h3>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {supportedChains.map((chain, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 transition-all duration-300 ${
                    activeChain === index
                      ? "border-primary bg-primary/10 scale-110 shadow-lg"
                      : "border-border bg-card hover:border-border/80"
                  }`}>
                  <span className="text-lg">{chain.logo}</span>
                  <span className="text-sm font-medium text-foreground">
                    {chain.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full border border-primary/30">
                <Globe className="w-5 h-5 text-primary mr-2" />
                <span className="text-sm font-medium text-foreground">
                  20+ Networks • 500+ DEXs • 15+ Bridges
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Features List */}
            <div className="space-y-6">
              <h3 className="text-xl font-medium text-foreground mb-6">
                Cross-Chain Capabilities
              </h3>
              {crossChainFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ease-out ${
                    isVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-8"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 400}ms` }}>
                  <Card className="border-2 border-border hover:border-border/80 hover:shadow-md transition-all duration-300 bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start">
                        <div
                          className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mr-4 flex-shrink-0`}>
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-foreground mb-2">
                            {feature.title}
                          </h4>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                            {feature.description}
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            {feature.example}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Interactive Demo */}
            <div
              className={`transition-all duration-1000 ease-out delay-600 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}>
              <Card className="bg-card text-card-foreground shadow-2xl border border-border">
                <div className="bg-muted p-4 rounded-t-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mr-3 animate-pulse-ring">
                      <ArrowRightLeft className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        LiFi Cross-Chain
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Powered by Zest AI
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Swap Example */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-foreground">
                          Cross-Chain Swap
                        </span>
                        <span className="text-xs text-green-500">
                          ✓ Best Rate
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="text-lg font-medium">100 USDC</div>
                          <div className="text-xs text-muted-foreground">
                            Ethereum
                          </div>
                        </div>
                        <ArrowRightLeft className="w-5 h-5 text-primary animate-pulse" />
                        <div className="text-center">
                          <div className="text-lg font-medium">0.702 SOL</div>
                          <div className="text-xs text-muted-foreground">
                            Solana
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground text-center">
                        Route: Ethereum → Wormhole → Solana • Fee: $0.15 • Time:
                        ~2 min
                      </div>
                    </div>

                    {/* Bridge Example */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-foreground">
                          Bridge Assets
                        </span>
                        <span className="text-xs text-blue-500">⚡ Fast</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="text-lg font-medium">50 USDC</div>
                          <div className="text-xs text-muted-foreground">
                            Polygon
                          </div>
                        </div>
                        <Globe className="w-5 h-5 text-purple-500 animate-spin-slow" />
                        <div className="text-center">
                          <div className="text-lg font-medium">50 USDC</div>
                          <div className="text-xs text-muted-foreground">
                            Base
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground text-center">
                        Route: Polygon → Stargate → Base • Fee: $0.08 • Time:
                        ~30 sec
                      </div>
                    </div>

                    {/* Zap Example */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-foreground">
                          Smart Zap
                        </span>
                        <span className="text-xs text-amber-500">
                          🚀 One-Click
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-medium mb-2">
                          ETH → Arbitrum Staking
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Swap ETH → Bridge to Arbitrum → Stake in one
                          transaction
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() =>
                        window.open(
                          "https://wa.me/+14155238886?text=Swap 100 USDC to SOL",
                          "_blank"
                        )
                      }>
                      Try Cross-Chain on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Networks", value: "20+" },
                  { label: "DEXs", value: "500+" },
                  { label: "Avg Time", value: "<2min" },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="text-center p-4 bg-card rounded-lg border border-border">
                    <div className="text-2xl font-light text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes pulse-gentle {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 currentColor;
          }
          70% {
            box-shadow: 0 0 0 10px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </section>
  );
}
