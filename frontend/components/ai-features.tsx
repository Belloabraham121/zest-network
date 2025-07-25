"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  Brain,
  MessageCircle,
  Zap,
  Shield,
  Globe,
  Mic,
  Volume2,
} from "lucide-react";

export function AIFeatures() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
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

  const aiFeatures = [
    {
      icon: Brain,
      title: "Natural Conversations",
      description:
        "Chat naturally on WhatsApp - say 'send money to mom' or 'how much did I earn today?' Our AI understands context and intent.",
      example:
        "You: 'Can you send $20 to my brother?'\nZest AI: 'I'll help you send $20 USDC! What's your brother's phone number? 💰'",
      color: "text-purple-600 bg-purple-50",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Native",
      description:
        "Everything happens in WhatsApp - no separate apps. Voice messages, emojis, media sharing - all supported by our AI.",
      example:
        "🎤 Voice: 'Check my balance'\nZest AI: 'You have $127.45 USDC! 📊 Your staking earned $0.23 today! 🎉'",
      color: "text-green-600 bg-green-50",
    },
    {
      icon: Globe,
      title: "Multilingual AI",
      description:
        "Communicate in your language - English, Spanish, Portuguese, French, Swahili, Yoruba, and more. AI auto-detects and responds.",
      example:
        "Usuario: 'Enviar dinero'\nZest AI: '¡Perfecto! ¿A quién quieres enviar dinero? 🇪🇸'",
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Zap,
      title: "Instant Intelligence",
      description:
        "Get smart insights, market updates, and personalized recommendations instantly. AI learns your patterns and preferences.",
      example:
        "Zest AI: '🔥 Great time to stake! Network fees are 40% lower right now. Want to stake your idle USDC?'",
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: Shield,
      title: "Smart Security",
      description:
        "AI-powered fraud detection, security alerts, and transaction verification. Protects you from scams and suspicious activity.",
      example:
        "🚨 Zest AI: 'Unusual transaction detected! Someone asking for wallet info? That's a scam - I'll never ask for that!'",
      color: "text-red-600 bg-red-50",
    },
    {
      icon: Mic,
      title: "Voice & Media",
      description:
        "Send voice messages, share images, use emojis - our AI understands it all. WhatsApp features work seamlessly with crypto.",
      example:
        "🎤 Voice: 'Show my portfolio'\nZest AI: 'Here's your portfolio! 📈 [Sends detailed chart image]'",
      color: "text-teal-600 bg-teal-50",
    },
  ];

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % aiFeatures.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isVisible, aiFeatures.length]);

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-muted/30 relative overflow-hidden">
      {/* WhatsApp-themed background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 border border-primary rounded-full animate-spin-slow"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 border border-primary rounded-full animate-spin-slow-reverse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary rounded-full animate-pulse-slow"></div>
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
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              AI Built for WhatsApp
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our AI assistant lives inside WhatsApp, understanding natural
              conversation and making crypto as easy as texting a friend.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Features List */}
            <div className="space-y-6">
              {aiFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ease-out cursor-pointer ${
                    isVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-8"
                  } ${
                    activeFeature === index ? "scale-105" : "hover:scale-102"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  onClick={() => setActiveFeature(index)}>
                  <Card
                    className={`border-2 transition-all duration-300 ${
                      activeFeature === index
                        ? "border-primary shadow-lg bg-primary/10"
                        : "border-border hover:border-border/80 hover:shadow-md bg-card"
                    }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start">
                        <div
                          className={`w-12 h-12 ${
                            feature.color
                          } rounded-xl flex items-center justify-center mr-4 flex-shrink-0 transition-transform duration-300 ${
                            activeFeature === index ? "scale-110" : ""
                          }`}>
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* WhatsApp Interface Demo */}
            <div
              className={`transition-all duration-1000 ease-out delay-300 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}>
              <Card className="bg-card shadow-2xl border border-border">
                <div className="bg-primary p-4 rounded-t-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mr-3 animate-pulse-ring">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-primary-foreground">
                        Zest AI
                      </div>
                      <div className="text-xs text-primary-foreground/80">
                        Online • Your crypto assistant
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 bg-muted">
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 text-primary">
                      {aiFeatures[activeFeature].title}
                    </h4>
                    <div className="bg-card rounded-lg p-4 border border-border">
                      <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                        {aiFeatures[activeFeature].example}
                      </pre>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>✓✓ Delivered • AI Response: &lt;100ms</span>
                    <div className="flex items-center">
                      <Volume2 className="w-3 h-3 mr-1" />
                      <span>Voice Enabled</span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-4 flex space-x-1">
                    {aiFeatures.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 flex-1 rounded transition-all duration-300 ${
                          index === activeFeature ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Languages", value: "12+" },
                  { label: "Response Time", value: "<100ms" },
                  { label: "Accuracy", value: "99.7%" },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="text-center p-4 bg-card rounded-lg border border-border shadow-sm">
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
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-slow-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.05;
            transform: scale(1);
          }
          50% {
            opacity: 0.1;
            transform: scale(1.05);
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
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 15s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </section>
  );
}
