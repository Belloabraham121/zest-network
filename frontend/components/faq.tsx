"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(false);
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

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqs = [
    {
      q: "What is Zest?",
      a: "Zest is a platform that lets you send, stake, swap, and bridge crypto across 20+ blockchains using WhatsApp, SMS, or USSD - no wallet apps or seed phrases required. Our AI assistant makes cross-chain DeFi simple for everyone.",
    },
    {
      q: "How does cross-chain swapping work?",
      a: "Our AI uses LiFi Protocol to find the best rates across 500+ DEXs and 15+ bridges. Simply say 'swap ETH to SOL' and our AI handles the complex routing automatically, giving you the best rate and lowest fees.",
    },
    {
      q: "Which blockchains are supported?",
      a: "We support 20+ networks including Ethereum, Solana, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain, and more. Our AI can swap and bridge between any supported chains seamlessly.",
    },
    {
      q: "How fast are cross-chain transactions?",
      a: "Most swaps complete in under 30 seconds, while bridges typically take 2-5 minutes depending on the chains involved. Our AI always shows you the estimated time before confirming any transaction.",
    },
    {
      q: "What are the fees for cross-chain operations?",
      a: "Fees vary by operation: simple swaps cost $0.10-$2, bridges cost $0.50-$5, and complex zaps cost $2-$10. Our AI always finds the cheapest route and shows all fees upfront before you confirm.",
    },
    {
      q: "How does SMS crypto work?",
      a: "Simply text commands to +1-555-ZEST (9378) from any phone. Our AI understands natural language, so you can say 'send $20 to mom' or 'swap to SOL'. No internet required - works on any mobile network.",
    },
    {
      q: "What can the AI assistant do?",
      a: "Our AI helps with transactions, cross-chain swaps, bridges, finds best rates across 500+ DEXs, detects fraud, supports multiple languages, and offers 24/7 assistance. It understands context and learns your preferences over time.",
    },
    {
      q: "Do I need a smartphone?",
      a: "No! You can use Zest through WhatsApp (smartphone), SMS (any phone), or USSD (any phone). Our AI works across all channels to provide the same cross-chain capabilities.",
    },
    {
      q: "What languages does the AI support?",
      a: "Our AI supports 12+ languages including English, Spanish, Portuguese, French, Swahili, Yoruba, and other local languages. It automatically detects your preferred language.",
    },
    {
      q: "How secure are cross-chain operations?",
      a: "We use battle-tested protocols like LiFi, Stargate, and Wormhole with insurance coverage. Our AI includes fraud detection and will ask for confirmation on large or unusual transactions.",
    },
    {
      q: "How are my funds secured?",
      a: "Your funds are protected by enterprise-grade custodial wallets linked to your phone number, built on multiple secure blockchains with cross-chain compatibility.",
    },
    {
      q: "What if I lose my phone?",
      a: "Your wallet is linked to your phone number, not the device. Get a new SIM with the same number and access your funds immediately across all supported chains.",
    },
    {
      q: "Which countries are supported?",
      a: "We support major networks across Nigeria, Kenya, Ghana, Brazil, Mexico, and Colombia, with cross-chain capabilities available globally.",
    },
  ];

  return (
    <section ref={sectionRef} id="faq" className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openItems.includes(index);

              return (
                <div
                  key={index}
                  className={`bg-card rounded-lg border border-border hover:border-border/80 transition-all duration-300 hover:shadow-md ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}>
                  <button
                    className="w-full text-left p-6 flex items-center justify-between hover:bg-muted transition-colors duration-200 rounded-lg"
                    onClick={() => toggleItem(index)}>
                    <span className="font-medium text-foreground pr-4">
                      {faq.q}
                    </span>
                    <div className="flex-shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                      )}
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                    <div className="px-6 pb-6">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`text-center mt-12 transition-all duration-1000 ease-out delay-700 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <button className="text-foreground hover:text-primary font-medium transition-colors duration-200 hover:underline">
              Contact support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
