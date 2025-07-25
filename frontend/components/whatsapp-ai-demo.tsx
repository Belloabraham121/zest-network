"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Mic, Camera, Paperclip } from "lucide-react";

interface WhatsAppMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
  hasEmoji?: boolean;
}

export function WhatsAppAIDemo() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: 1,
      text: "Hi! I'm Zest AI 🤖 Your personal crypto assistant on WhatsApp!\n\nI can help you:\n💰 Send crypto to anyone\n📈 Stake and earn rewards\n💳 Check your balance\n🔒 Keep your funds secure\n\nJust chat with me naturally - no commands needed!",
      isUser: false,
      timestamp: new Date(Date.now() - 300000),
      hasEmoji: true,
    },
  ]);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const demoScenarios = [
    {
      title: "Natural Language Sending",
      steps: [
        { text: "Hey, can you send $20 to my brother?", isUser: true },
        {
          text: "Of course! I'll help you send $20 USDC to your brother 💸\n\nWhat's his phone number?",
          isUser: false,
          hasEmoji: true,
        },
        { text: "+1 555 123 4567", isUser: true },
        {
          text: "Perfect! Here's what I'm sending:\n\n💰 Amount: $20 USDC\n📱 To: +1 555 123 4567 (Brother)\n💵 Fee: $0.05\n\nShould I go ahead? Just say 'yes' or 'send it'! ✅",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Yes, send it!", isUser: true },
        {
          text: "✅ Done! $20 USDC sent successfully!\n\n🎉 Your brother will get an SMS with instructions to claim the funds\n💳 Your new balance: $127.45 USDC\n📋 Transaction ID: zest_tx_789\n\nAnything else I can help with?",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Smart Balance & Insights",
      steps: [
        { text: "What's my balance?", isUser: true },
        {
          text: "Here's your Zest wallet summary! 📊\n\n💰 Total Balance: $147.45\n• 127.45 USDC\n• 0.008 ETH ($20.00)\n\n📈 Staking: $50 USDC (earning 8.5% APY)\n💵 Today's earnings: $0.12\n\n🔥 You're doing great! Your portfolio is up 2.3% this week!",
          isUser: false,
          hasEmoji: true,
        },
        {
          text: "Nice! How much will I earn this month from staking?",
          isUser: true,
        },
        {
          text: "Great question! 🤓\n\nWith your current $50 USDC staked at 8.5% APY:\n📅 Monthly earnings: ~$3.54\n📅 Daily earnings: ~$0.12\n\n💡 Pro tip: If you stake another $50, you could earn ~$7.08/month!\n\nWant me to help you stake more? 🚀",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Voice & Multilingual",
      steps: [
        {
          text: "🎤 [Voice Message: 'Hey Zest, envía 30 dólares a mi mamá']",
          isUser: true,
        },
        {
          text: "¡Hola! Entiendo que quieres enviar $30 a tu mamá 🇪🇸\n\n¿Cuál es el número de teléfono de tu mamá?\n\n(I can switch back to English anytime - just let me know! 😊)",
          isUser: false,
          hasEmoji: true,
        },
        {
          text: "Actually, let's continue in English. +52 555 987 6543",
          isUser: true,
        },
        {
          text: "No problem! Switching to English 🇺🇸\n\n💰 Sending: $30 USDC\n📱 To: +52 555 987 6543 (Mom)\n🇲🇽 Mexico number detected - perfect!\n\nReady to send? 🚀",
          isUser: false,
          hasEmoji: true,
        },
        { text: "Yes please", isUser: true },
        {
          text: "✅ $30 USDC sent to mom!\n\n🎉 She'll receive an SMS in Spanish with claim instructions\n💝 Such a thoughtful son/daughter!\n\nYour new balance: $97.45 USDC",
          isUser: false,
          hasEmoji: true,
        },
      ],
    },
    {
      title: "Smart Security & Help",
      steps: [
        {
          text: "I got a weird message asking for my wallet info. Is this legit?",
          isUser: true,
        },
        {
          text: "🚨 SECURITY ALERT! 🚨\n\nThat sounds like a scam! Here's what you need to know:\n\n❌ NEVER share wallet details\n❌ Zest will NEVER ask for private info via random messages\n✅ We only communicate through this verified WhatsApp\n\n🛡️ Your funds are safe with Zest - we use your phone number as your secure key!\n\nCan you forward me that suspicious message?",
          isUser: false,
          hasEmoji: true,
        },
        {
          text: "Thanks for the warning! How do I know this WhatsApp is really Zest?",
          isUser: true,
        },
        {
          text: "Smart question! 🧠 Here's how to verify:\n\n✅ This number: +1-555-ZEST (official)\n✅ Green checkmark (verified business)\n✅ Profile shows 'Zest Network - Official'\n✅ We never ask for passwords/seeds\n\n🔒 Always check these signs! Your security is our priority.\n\nWant me to enable extra security alerts for your account?",
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
        text: "Hi! I'm Zest AI 🤖 Your personal crypto assistant on WhatsApp!\n\nI can help you:\n💰 Send crypto to anyone\n📈 Stake and earn rewards\n💳 Check your balance\n🔒 Keep your funds secure\n\nJust chat with me naturally - no commands needed!",
        isUser: false,
        timestamp: new Date(Date.now() - 300000),
        hasEmoji: true,
      },
    ]);

    const scenario = demoScenarios[scenarioIndex];

    for (let i = 0; i < scenario.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show typing indicator for AI responses
      if (!scenario.steps[i].isUser && i > 0) {
        const typingMessage: WhatsAppMessage = {
          id: Date.now() + i - 0.5,
          text: "Zest AI is typing...",
          isUser: false,
          timestamp: new Date(),
          isTyping: true,
        };
        setMessages((prev) => [...prev, typingMessage]);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Remove typing indicator
        setMessages((prev) => prev.filter((msg) => !msg.isTyping));
      }

      const newMessage: WhatsAppMessage = {
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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              AI-Powered WhatsApp Experience
            </h2>
            <p className="text-lg text-muted-foreground">
              Chat naturally with our AI assistant - no commands, no complexity,
              just conversation
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Demo Controls */}
            <div>
              <h3 className="text-xl font-medium text-foreground mb-6">
                Experience AI Conversations
              </h3>
              <div className="space-y-4">
                {demoScenarios.map((scenario, index) => (
                  <Button
                    key={index}
                    onClick={() => playDemo(index)}
                    disabled={isPlaying}
                    className={`w-full justify-start p-4 h-auto cursor-pointer ${
                      currentDemo === index && !isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground border border-border hover:bg-muted"
                    }`}>
                    <div className="text-left">
                      <div className="font-medium">{scenario.title}</div>
                      <div className="text-sm opacity-75 mt-1">
                        {scenario.title === "Natural Language Sending" &&
                          "Send crypto using everyday language"}
                        {scenario.title === "Smart Balance & Insights" &&
                          "Get intelligent portfolio insights"}
                        {scenario.title === "Voice & Multilingual" &&
                          "Voice messages in multiple languages"}
                        {scenario.title === "Smart Security & Help" &&
                          "AI-powered security and fraud protection"}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="mt-8 p-6 bg-muted rounded-lg border border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-primary" />
                  AI Features in WhatsApp
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Natural language understanding - chat like you normally
                    would
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Voice message support in 12+ languages
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Smart security alerts and fraud detection
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Personalized insights and recommendations
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    24/7 availability with instant responses
                  </li>
                </ul>
              </div>
            </div>

            {/* WhatsApp Interface */}
            <div>
              <Card className="bg-card shadow-2xl border border-border">
                <div className="bg-primary p-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-foreground rounded-full flex items-center justify-center mr-3">
                        <MessageCircle className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-primary-foreground">
                          Zest AI
                        </div>
                        <div className="text-xs text-primary-foreground/80">
                          Online • AI Assistant
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      </button>
                      <button className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                        <Mic className="w-4 h-4 text-primary-foreground" />
                      </button>
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
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : message.isTyping
                              ? "bg-muted text-muted-foreground animate-pulse"
                              : "bg-card text-card-foreground border border-border rounded-bl-sm"
                          }`}>
                          <p className="text-sm whitespace-pre-line">
                            {message.text}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-75">
                              {message.timestamp
                                .getHours()
                                .toString()
                                .padStart(2, "0")}
                              :
                              {message.timestamp
                                .getMinutes()
                                .toString()
                                .padStart(2, "0")}
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
                          AI Demo in progress...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Input Bar */}
                  <div className="border-t border-border p-4 bg-card">
                    <div className="flex items-center space-x-2">
                      <button className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <div className="flex-1 bg-muted rounded-full px-4 py-2">
                        <span className="text-muted-foreground text-sm">
                          Type a message...
                        </span>
                      </div>
                      <button className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Mic className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Ready to chat with Zest AI?
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() =>
                    window.open(
                      "https://wa.me/+1415523-8886?text=HELP",
                      "_blank"
                    )
                  }>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start WhatsApp Chat
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
