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
      a: "Zest is a platform that lets you send, stake, and manage crypto using WhatsApp or USSD - no wallet apps or seed phrases required.",
    },
    {
      q: "Do I need a smartphone?",
      a: "No. While you can use WhatsApp on smartphones, our USSD service works on any phone, including basic feature phones.",
    },
    {
      q: "How are my funds secured?",
      a: "Your funds are protected by enterprise-grade custodial wallets linked to your phone number, built on Mantle blockchain.",
    },
    {
      q: "What if I lose my phone?",
      a: "Your wallet is linked to your phone number, not the device. Get a new SIM with the same number and access your funds immediately.",
    },
    {
      q: "What cryptocurrencies are supported?",
      a: "We currently support USDC, USDT, and other major stablecoins, with more being added regularly.",
    },
    {
      q: "Are there fees?",
      a: "We charge minimal fees to cover blockchain costs. Most transactions cost under $0.10.",
    },
    {
      q: "Which countries are supported?",
      a: "We support major networks across Nigeria, Kenya, Ghana, Brazil, Mexico, and Colombia, with more countries being added.",
    },
  ];

  return (
    <section ref={sectionRef} id="faq" className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-800 mb-6">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openItems.includes(index);

              return (
                <div
                  key={index}
                  className={`bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-md ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}>
                  <button
                    className="w-full text-left p-6 flex items-center justify-between hover:bg-slate-100 transition-colors duration-200 rounded-lg"
                    onClick={() => toggleItem(index)}>
                    <span className="font-medium text-slate-800 pr-4">
                      {faq.q}
                    </span>
                    <div className="flex-shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-slate-600 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600 transition-transform duration-200" />
                      )}
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">{faq.a}</p>
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
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <button className="text-slate-800 hover:text-teal-700 font-medium transition-colors duration-200 hover:underline">
              Contact support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
