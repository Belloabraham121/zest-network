"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Smartphone } from "lucide-react";

interface SMSMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: "sending" | "sent" | "delivered";
}

export function SMSDemo() {
  const [messages, setMessages] = useState<SMSMessage[]>([
    {
      id: 1,
      text: "Welcome to Zest Network! 🚀\n\nYour crypto wallet is ready. Reply with:\n• BALANCE - Check funds\n• SEND - Transfer crypto\n• STAKE - Earn rewards\n• HELP - Get assistance",
      isUser: false,
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const demoScenarios = [
    {
      title: "Check Balance",
      steps: [
        { text: "BALANCE", isUser: true },
        {
          text: "💰 Your Zest Wallet Balance:\n\n• 45.50 USDC\n• 0.025 ETH\n• $47.23 total\n\nLast transaction: Received 10 USDC from +234567890\n\nReply HELP for more options",
          isUser: false,
        },
      ],
    },
    {
      title: "Send Crypto",
      steps: [
        { text: "SEND 10 USDC TO +234567890", isUser: true },
        {
          text: "🔄 Processing your transaction...\n\nSending: 10 USDC\nTo: +234567890\nFee: $0.05\n\nConfirm by replying YES",
          isUser: false,
        },
        { text: "YES", isUser: true },
        {
          text: "✅ Transaction Complete!\n\n10 USDC sent to +234567890\nTransaction ID: 0x7f2a...\nNew balance: 35.45 USDC\n\nRecipient will receive SMS instructions to claim funds.",
          isUser: false,
        },
      ],
    },
    {
      title: "Start Staking",
      steps: [
        { text: "STAKE 20 USDC", isUser: true },
        {
          text: "📈 Staking Opportunity!\n\nAmount: 20 USDC\nAPY: 8.5%\nEstimated monthly earnings: $1.42\n\nYour funds remain secure and can be unstaked anytime.\n\nConfirm by replying STAKE YES",
          isUser: false,
        },
        { text: "STAKE YES", isUser: true },
        {
          text: "🎉 Staking Active!\n\n20 USDC is now earning 8.5% APY\nDaily earnings: ~$0.047\nNext reward: Tomorrow 9:00 AM\n\nReply UNSTAKE [amount] to withdraw anytime",
          isUser: false,
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
        text: "Welcome to Zest Network! 🚀\n\nYour crypto wallet is ready. Reply with:\n• BALANCE - Check funds\n• SEND - Transfer crypto\n• STAKE - Earn rewards\n• HELP - Get assistance",
        isUser: false,
        timestamp: new Date(Date.now() - 60000),
      },
    ]);

    const scenario = demoScenarios[scenarioIndex];

    for (let i = 0; i < scenario.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newMessage: SMSMessage = {
        id: Date.now() + i,
        text: scenario.steps[i].text,
        isUser: scenario.steps[i].isUser,
        timestamp: new Date(),
        status: scenario.steps[i].isUser ? "sending" : undefined,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Update status for user messages
      if (scenario.steps[i].isUser) {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg
            )
          );
        }, 500);
      }
    }

    setIsPlaying(false);
  };

  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-slate-800 mb-6">
              SMS in Action
            </h2>
            <p className="text-lg text-slate-600">
              See how easy it is to manage crypto through simple text messages
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Demo Controls */}
            <div>
              <h3 className="text-xl font-medium text-slate-800 mb-6">
                Try a Demo Scenario
              </h3>
              <div className="space-y-4">
                {demoScenarios.map((scenario, index) => (
                  <Button
                    key={index}
                    onClick={() => playDemo(index)}
                    disabled={isPlaying}
                    className={`w-full justify-start p-4 h-auto ${
                      currentDemo === index && !isPlaying
                        ? "bg-teal-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}>
                    <div className="text-left">
                      <div className="font-medium">{scenario.title}</div>
                      <div className="text-sm opacity-75 mt-1">
                        {scenario.title === "Check Balance" &&
                          "See your crypto holdings instantly"}
                        {scenario.title === "Send Crypto" &&
                          "Transfer funds to any phone number"}
                        {scenario.title === "Start Staking" &&
                          "Earn passive income on your crypto"}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="mt-8 p-6 bg-white rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-teal-600" />
                  SMS Features
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Works on any phone - no smartphone required
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    No internet connection needed
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    AI-powered responses understand natural language
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Instant confirmations and transaction updates
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    24/7 support through text commands
                  </li>
                </ul>
              </div>
            </div>

            {/* SMS Interface */}
            <div>
              <Card className="bg-slate-800 text-white shadow-2xl">
                <div className="bg-slate-700 p-4 rounded-t-lg">
                  <div className="flex items-center">
                    <Smartphone className="w-5 h-5 mr-3" />
                    <div>
                      <div className="font-medium">SMS Messages</div>
                      <div className="text-xs opacity-75">
                        +1-555-ZEST (9378)
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isUser ? "justify-end" : "justify-start"
                        } animate-fade-in`}>
                        <div
                          className={`max-w-[85%] p-3 rounded-lg ${
                            message.isUser
                              ? "bg-teal-600 text-white"
                              : "bg-slate-600 text-slate-100"
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
                            {message.status && (
                              <span className="text-xs opacity-75">
                                {message.status === "sending" && "Sending..."}
                                {message.status === "sent" && "Sent"}
                                {message.status === "delivered" && "✓✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isPlaying && (
                      <div className="flex justify-center">
                        <div className="bg-slate-600 text-slate-300 px-4 py-2 rounded-full text-sm animate-pulse">
                          Demo in progress...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600 mb-2">
                  Ready to try SMS crypto?
                </p>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Text START to +1-555-ZEST
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
