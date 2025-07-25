"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [chatMessages, setChatMessages] = useState<number[]>([]);

  const fullText = "Crypto for everyone.";

  useEffect(() => {
    setIsVisible(true);

    // Typewriter effect
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
      }
    }, 120);

    // Cursor blinking
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 600);

    // Chat messages animation
    setTimeout(() => setChatMessages([1]), 1800);
    setTimeout(() => setChatMessages([1, 2]), 3200);
    setTimeout(() => setChatMessages([1, 2, 3]), 4600);
    setTimeout(() => setChatMessages([1, 2, 3, 4]), 6000);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <section
      id="home"
      className="pt-24 pb-20 bg-gradient-to-b from-background via-background to-background/95 relative overflow-hidden min-h-screen flex items-center">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/30 via-transparent to-transparent opacity-80 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-indigo-900/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => {
          // Use deterministic values based on index to avoid hydration mismatch
          const left = (i * 5.5) % 100;
          const top = (i * 3.7) % 100;
          const animationDelay = (i * 0.15) % 3;
          const animationDuration = 2 + ((i * 0.1) % 2);

          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${animationDelay}s`,
                animationDuration: `${animationDuration}s`,
              }}
            />
          );
        })}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="text-left">
            {/* Pre-headline */}
            <div
              className={`transition-opacity duration-1000 ease-out ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}>
              {/* <div className="text-sm font-medium text-primary/80 mb-4 tracking-wider">
                [ 20+ blockchains supported ]
              </div> */}
            </div>

            {/* Hero Title */}
            <div
              className={`transition-opacity duration-1000 ease-out ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6 tracking-tight">
                <div className="whitespace-nowrap">
                  <span className="inline">
                    {typewriterText}
                    {showCursor && (
                      <span className="animate-pulse text-primary">|</span>
                    )}
                  </span>
                </div>
                <div
                  className="text-2xl sm:text-3xl lg:text-4xl font-medium text-primary animate-fade-in bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
                  style={{ animationDelay: "2s", animationFillMode: "both" }}>
                  AI-powered crypto on WhatsApp.
                </div>
              </h1>
            </div>

            {/* Hero Description */}
            <div
              className={`transition-opacity duration-1000 ease-out delay-200 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
                Simplified cross-chain transactions with unrivaled market access
                via Zest. Effortlessly send, stake, swap, and bridge crypto
                across 20+ blockchains using WhatsApp, SMS, or any phone.
              </p>
            </div>

            {/* Call-to-Action Button */}
            <div
              className={`transition-opacity duration-1000 ease-out delay-400 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white px-8 py-6 rounded-xl text-lg font-semibold transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105 relative overflow-hidden group border border-primary/30"
                onClick={() =>
                  window.open("https://wa.me/+14155238886?text=Help", "_blank")
                }>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>
                <span className="relative z-10">Get Started →</span>
              </Button>
            </div>
          </div>

          {/* Right side - Visual Elements */}
          <div className="relative lg:block hidden lg:ml-16">
            {/* Floating icons with glow effects */}
            <div className="relative w-full h-full">
              {/* Light beam effect */}
              <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-primary/50 via-primary/30 to-transparent transform -translate-x-1/2"></div>

              {/* Floating icons */}
              <div className="relative space-y-12 w-full">
                {/* Top icon - Ethereum-like */}
                <div className="relative transform translate-x-12 -translate-y-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 shadow-2xl shadow-blue-500/20 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-white rounded-lg transform rotate-45"></div>
                    </div>
                  </div>
                </div>

                {/* Middle icon - Token symbol */}
                <div className="relative transform -translate-x-8">
                  <div className="w-28 h-28 bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 flex items-center justify-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom icon - Chart bars */}
                <div className="relative transform translate-x-10 translate-y-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-xl flex items-center justify-center space-x-1">
                      <div className="w-1 h-6 bg-white rounded-sm"></div>
                      <div className="w-1 h-8 bg-white rounded-sm"></div>
                      <div className="w-1 h-4 bg-white rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Additional substantial visual elements */}
                <div className="absolute top-1/4 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/20 flex items-center justify-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white rounded-lg"></div>
                  </div>
                </div>

                <div className="absolute bottom-1/4 right-4 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-2xl border border-orange-500/30 shadow-2xl shadow-orange-500/20 flex items-center justify-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white rounded-full"></div>
                  </div>
                </div>

                {/* More substantial floating elements */}
                <div className="absolute top-1/3 right-8 w-16 h-16 bg-gradient-to-br from-cyan-500/25 to-blue-600/25 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
                  </div>
                </div>

                <div className="absolute top-2/3 right-2 w-14 h-14 bg-gradient-to-br from-pink-500/25 to-purple-600/25 rounded-2xl border border-pink-500/30 shadow-2xl shadow-pink-500/20 flex items-center justify-center">
                  <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                    <div className="w-3.5 h-3.5 border-2 border-white rounded-full"></div>
                  </div>
                </div>

                <div className="absolute bottom-1/3 right-12 w-18 h-18 bg-gradient-to-br from-yellow-500/25 to-orange-600/25 rounded-2xl border border-yellow-500/30 shadow-2xl shadow-yellow-500/20 flex items-center justify-center">
                  <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <div className="w-4.5 h-4.5 border-2 border-white rounded-lg"></div>
                  </div>
                </div>

                {/* Larger floating dots with glow */}
                <div className="absolute top-1/6 right-6 w-3 h-3 bg-white/40 rounded-full shadow-lg shadow-white/20"></div>
                <div className="absolute top-1/2 right-16 w-2.5 h-2.5 bg-white/35 rounded-full shadow-lg shadow-white/15"></div>
                <div className="absolute bottom-1/6 right-10 w-2 h-2 bg-white/45 rounded-full shadow-lg shadow-white/25"></div>
                <div className="absolute bottom-1/3 right-20 w-3.5 h-3.5 bg-white/30 rounded-full shadow-lg shadow-white/10"></div>

                {/* Substantial connection lines with glow */}
                <div className="absolute top-1/4 right-12 w-0.5 h-20 bg-gradient-to-b from-primary/50 to-transparent shadow-lg shadow-primary/30"></div>
                <div className="absolute bottom-1/2 right-8 w-0.5 h-16 bg-gradient-to-b from-primary/40 to-transparent shadow-lg shadow-primary/25"></div>
                <div className="absolute top-3/4 right-16 w-0.5 h-12 bg-gradient-to-b from-primary/45 to-transparent shadow-lg shadow-primary/20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Mockup - Mobile only */}
        <div className="lg:hidden mt-12">
          <div
            className={`transition-opacity duration-1000 ease-out delay-600 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}>
            <div className="max-w-sm mx-auto">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-2xl">
                <div className="bg-muted/50 rounded-xl p-5">
                  <div className="flex items-center mb-4 pb-3 border-b border-border/50">
                    <div className="w-10 h-10 bg-primary rounded-full mr-3 flex items-center justify-center">
                      <span className="text-primary-foreground font-medium text-sm">
                        ZA
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">
                        Zest AI
                      </span>
                      <div className="text-xs text-muted-foreground">
                        Online • AI Assistant
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div
                      className={`bg-muted/50 rounded-lg p-3 text-left transition-all duration-500 ${
                        chatMessages.includes(1)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4"
                      }`}>
                      <p className="text-foreground font-medium">
                        Swap 100 USDC to SOL
                      </p>
                    </div>

                    <div
                      className={`bg-primary text-primary-foreground rounded-lg p-3 text-left transition-all duration-500 delay-200 ${
                        chatMessages.includes(2)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 translate-x-4"
                      }`}>
                      <p className="font-medium">
                        Got it! Swapping 100 USDC to SOL... 🔄
                      </p>
                      <p className="text-primary-foreground/80 text-xs mt-1">
                        Best rate: 1 SOL = $142.50
                      </p>
                    </div>

                    <div
                      className={`bg-muted/50 rounded-lg p-3 text-left transition-all duration-500 delay-400 ${
                        chatMessages.includes(3)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4"
                      }`}>
                      <p className="text-foreground font-medium">
                        Looks good, proceed
                      </p>
                    </div>

                    <div
                      className={`bg-primary text-primary-foreground rounded-lg p-3 text-left transition-all duration-500 delay-600 ${
                        chatMessages.includes(4)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 translate-x-4"
                      }`}>
                      <p className="font-medium">✅ Done! You got 0.702 SOL</p>
                      <p className="text-primary-foreground/80 text-xs mt-1">
                        Via LiFi • Fee: $0.15
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </section>
  );
}
