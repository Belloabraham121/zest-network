"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  TrendingUp,
  MessageSquare,
  ArrowRightLeft,
  Globe,
  MessageCircle,
  Phone,
} from "lucide-react";

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "ussd" | "sms">(
    "whatsapp"
  );
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Animate steps sequentially
          setTimeout(() => setActiveStep(1), 500);
          setTimeout(() => setActiveStep(2), 1000);
          setTimeout(() => setActiveStep(3), 1500);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-16 bg-slate-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-100 rounded-full opacity-20 animate-pulse-slow"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-200 rounded-full opacity-20 animate-pulse-slow"
          style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-800 mb-6">
              How it works
            </h2>
            <p className="text-lg text-slate-600">
              Three simple steps to start using crypto
            </p>

            {/* Progress bar */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between mb-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 ${
                      activeStep >= step
                        ? "bg-teal-600 text-white scale-110"
                        : "bg-slate-300 text-slate-600"
                    }`}>
                    {step}
                  </div>
                ))}
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-1000 ease-out"
                  style={{ width: `${(activeStep / 3) * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* Enhanced Tab Selector */}
          <div
            className={`flex justify-center mb-12 transition-all duration-1000 ease-out delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 relative overflow-hidden flex">
              {/* Sliding background */}
              <div
                className={`absolute top-1 bottom-1 left-0 w-1/3 bg-slate-800 rounded-md transition-all duration-500 ease-in-out transform ${
                  activeTab === "whatsapp"
                    ? "translate-x-0"
                    : activeTab === "ussd"
                    ? "translate-x-full"
                    : "translate-x-[200%]"
                }`}
              />

              {/* WhatsApp Button */}
              <Button
                variant="ghost"
                className={`w-40 text-sm transition-all duration-200 relative z-10 ${
                  activeTab === "whatsapp"
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setActiveTab("whatsapp")}>
                <MessageCircle className="w-4 h-4 mr-2 animate-bounce-on-hover" />
                WhatsApp
              </Button>

              {/* USSD Button */}
              <Button
                variant="ghost"
                className={`w-40 text-sm transition-all duration-200 relative z-10 ${
                  activeTab === "ussd"
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setActiveTab("ussd")}>
                <Phone className="w-4 h-4 mr-2 animate-bounce-on-hover" />
                USSD
              </Button>

              {/* SMS Button */}
              <Button
                variant="ghost"
                className={`w-40 text-sm transition-all duration-200 relative z-10 ${
                  activeTab === "sms"
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setActiveTab("sms")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </Button>
            </div>
          </div>

          {/* Enhanced Steps */}
          <div className="space-y-12">
            {/* Step 1 */}
            <div
              className={`flex items-start transition-all duration-1000 ease-out delay-300 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}>
              <div className="flex-shrink-0 w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-medium mr-6 mt-1 relative overflow-hidden group">
                <span className="relative z-10">1</span>
                <div className="absolute inset-0 bg-teal-600 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-slate-800 mb-4">
                  Get started
                </h3>
                <div className="bg-white rounded-lg p-6 border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md transform hover:scale-105">
                  <div
                    className={`transition-all duration-500 ${
                      activeTab === "whatsapp"
                        ? "opacity-100"
                        : "opacity-0 absolute"
                    }`}>
                    {activeTab === "whatsapp" && (
                      <div>
                        <p className="text-slate-700 mb-3">
                          Send &quot;START&quot; to our WhatsApp
                        </p>
                        <Button
                          className="bg-teal-600 hover:bg-teal-700 text-white text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-glow"
                          onClick={() =>
                            window.open(
                              "https://wa.me/+1415523-8886?text=HELP",
                              "_blank"
                            )
                          }>
                          Start Now
                        </Button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`transition-all duration-500 ${
                      activeTab === "ussd"
                        ? "opacity-100"
                        : "opacity-0 absolute"
                    }`}>
                    {activeTab === "ussd" && (
                      <div>
                        <p className="text-slate-700 mb-3">Dial on any phone</p>
                        <p className="font-mono text-2xl text-slate-800 hover:text-teal-700 transition-colors duration-200 animate-pulse-number">
                          *777#
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className={`transition-all duration-500 ${
                      activeTab === "sms" ? "opacity-100" : "opacity-0 absolute"
                    }`}>
                    {activeTab === "sms" && (
                      <div>
                        <p className="text-slate-700 mb-3">
                          Text &quot;START&quot; to our SMS number
                        </p>
                        <p className="font-mono text-xl text-slate-800 hover:text-teal-700 transition-colors duration-200">
                          +1 (415) 523-8886
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Works on any phone, no internet needed
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`flex items-start transition-all duration-1000 ease-out delay-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}>
              <div className="flex-shrink-0 w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-medium mr-6 mt-1 relative overflow-hidden group">
                <span className="relative z-10">2</span>
                <div className="absolute inset-0 bg-teal-600 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-slate-800 mb-4">
                  Your wallet is created
                </h3>
                <div className="relative">
                  <p className="text-slate-600 hover:text-slate-800 transition-colors duration-200">
                    We automatically create a secure wallet linked to your phone
                    number. No seed phrases to remember.
                  </p>
                  <div className="absolute -right-4 -top-2 w-8 h-8 bg-teal-100 rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
            </div>

            {/* Step 3 - Enhanced action cards */}
            <div
              className={`flex items-start transition-all duration-1000 ease-out delay-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}>
              <div className="flex-shrink-0 w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-medium mr-6 mt-1 relative overflow-hidden group">
                <span className="relative z-10">3</span>
                <div className="absolute inset-0 bg-teal-600 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-slate-800 mb-6">
                  Start using crypto
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Send,
                      title: "Send",
                      whatsapp: "Send 10 USDC to +234...",
                      ussd: "Dial *777*1*10*234...#",
                      sms: "Text: Send 10 USDC to +234...",
                      color: "text-blue-600",
                    },
                    {
                      icon: ArrowRightLeft,
                      title: "Swap",
                      whatsapp: "Swap ETH to SOL",
                      ussd: "Dial *777*4*ETH*SOL#",
                      sms: "Text: Swap ETH to SOL",
                      color: "text-purple-600",
                    },
                    {
                      icon: TrendingUp,
                      title: "Stake",
                      whatsapp: "Stake 20 USDC",
                      ussd: "Dial *777*2*20#",
                      sms: "Text: Stake 20 USDC",
                      color: "text-emerald-600",
                    },
                    {
                      icon: Globe,
                      title: "Bridge",
                      whatsapp: "Bridge USDC to Arbitrum",
                      ussd: "Dial *777*5*USDC*ARB#",
                      sms: "Text: Bridge to Arbitrum",
                      color: "text-amber-600",
                    },
                  ].map((action, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-6 border border-slate-200 hover:border-teal-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-2 group perspective-1000"
                      style={{ animationDelay: `${index * 200}ms` }}>
                      <div className="transform transition-transform duration-300 group-hover:rotateY-5">
                        <action.icon
                          className={`w-6 h-6 ${action.color} mb-3 group-hover:scale-110 transition-transform duration-200`}
                        />
                        <h4 className="font-medium text-slate-800 mb-2 group-hover:text-slate-900 transition-colors duration-200">
                          {action.title}
                        </h4>
                        <p className="text-sm text-slate-600 mb-3 group-hover:text-slate-700 transition-colors duration-200">
                          {activeTab === "whatsapp"
                            ? action.whatsapp
                            : activeTab === "ussd"
                            ? action.ussd
                            : action.sms}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.3;
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(20, 184, 166, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(20, 184, 166, 0.8);
          }
        }

        @keyframes pulse-number {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes bounce-on-hover {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-pulse-number {
          animation: pulse-number 2s ease-in-out infinite;
        }

        .animate-bounce-on-hover:hover {
          animation: bounce-on-hover 0.5s ease-in-out;
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .rotateY-5 {
          transform: rotateY(5deg);
        }
      `}</style>
    </section>
  );
}
