"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, MessageSquare } from "lucide-react";

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
    }, 100);

    // Cursor blinking
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    // Chat messages animation with AI responses
    setTimeout(() => setChatMessages([1]), 2000);
    setTimeout(() => setChatMessages([1, 2]), 3500);
    setTimeout(() => setChatMessages([1, 2, 3]), 5000);
    setTimeout(() => setChatMessages([1, 2, 3, 4]), 6500);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <section id="home" className="pt-24 pb-16 bg-slate-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-slate-800 leading-tight mb-8">
              <span className="inline-block">
                {typewriterText}
                {showCursor && <span className="animate-pulse">|</span>}
              </span>
              <br />
              <span
                className="font-medium text-teal-700 animate-fade-in-up"
                style={{ animationDelay: "3s", animationFillMode: "both" }}>
                AI-powered crypto on WhatsApp.
              </span>
            </h1>
          </div>

          <div
            className={`transition-all duration-1000 ease-out delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Send, stake, swap, and bridge crypto across 20+ blockchains using
              WhatsApp, SMS, or any phone. AI-powered assistance makes
              cross-chain DeFi simple for everyone.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 ease-out delay-400 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-pulse-subtle"
                onClick={() =>
                  window.open("https://wa.me/+14155238886?text=Help", "_blank")
                }>
                <MessageCircle className="w-4 h-4 mr-2 animate-bounce-subtle" />
                Chat with Zest AI
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 px-8 py-3 bg-transparent transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:scale-105">
                <Phone className="w-4 h-4 mr-2 animate-wiggle" />
                Or dial *777#
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50 px-8 py-3 bg-transparent transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <MessageSquare className="w-4 h-4 mr-2" />
                Text SMS
              </Button>
            </div>
          </div>

          {/* Enhanced WhatsApp mockup with AI conversation */}
          <div
            className={`transition-all duration-1000 ease-out delay-600 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="max-w-sm mx-auto">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 animate-float">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center mb-4 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 bg-teal-100 rounded-full mr-3 flex items-center justify-center animate-pulse-ring">
                      <div className="w-4 h-4 bg-teal-600 rounded-full"></div>
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">
                        Zest AI
                      </span>
                      <div className="text-xs text-slate-500">
                        Online • AI Assistant
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div
                      className={`bg-white rounded-lg p-3 text-left border border-slate-200 transition-all duration-500 ${
                        chatMessages.includes(1)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4"
                      }`}>
                      <p className="text-slate-700">Swap 100 USDC to SOL</p>
                    </div>

                    <div
                      className={`bg-slate-800 text-white rounded-lg p-3 text-left transition-all duration-500 delay-300 ${
                        chatMessages.includes(2)
                          ? "opacity-100 translate-x-0 scale-100"
                          : "opacity-0 translate-x-4 scale-95"
                      }`}>
                      <p className="animate-type-in">
                        I&apos;ll swap 100 USDC to SOL! 🔄
                      </p>
                      <p className="text-slate-300 text-xs mt-1">
                        Best rate: 1 SOL = $142.50
                      </p>
                    </div>

                    <div
                      className={`bg-white rounded-lg p-3 text-left border border-slate-200 transition-all duration-500 delay-500 ${
                        chatMessages.includes(3)
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4"
                      }`}>
                      <p className="text-slate-700">Yes, do it</p>
                    </div>

                    <div
                      className={`bg-slate-800 text-white rounded-lg p-3 text-left transition-all duration-500 delay-700 ${
                        chatMessages.includes(4)
                          ? "opacity-100 translate-x-0 scale-100"
                          : "opacity-0 translate-x-4 scale-95"
                      }`}>
                      <p className="animate-type-in">
                        ✅ Swapped! Got 0.702 SOL
                      </p>
                      <p className="text-slate-300 text-xs mt-1">
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
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(20, 184, 166, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(20, 184, 166, 0);
          }
        }

        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-3deg);
          }
          75% {
            transform: rotate(3deg);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(51, 65, 85, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(51, 65, 85, 0);
          }
        }

        @keyframes type-in {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }

        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite;
        }

        .animate-type-in {
          overflow: hidden;
          white-space: nowrap;
          animation: type-in 1s steps(20, end);
        }

        .animate-fade-in {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}
