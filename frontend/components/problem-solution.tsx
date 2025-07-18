"use client";

import { useEffect, useRef, useState } from "react";

export function ProblemSolution() {
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

  return (
    <section ref={sectionRef} className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light text-slate-800 mb-6">
              DeFi shouldn&apos;t be this hard
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Millions are excluded from crypto because of complex apps, seed
              phrases, and expensive smartphones. We&apos;re changing that.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Problem */}
            <div
              className={`transition-all duration-1000 ease-out delay-200 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}>
              <h3 className="text-xl font-medium text-slate-800 mb-6">
                The problem
              </h3>
              <div className="space-y-4">
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-amber-600 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Complex wallet apps with confusing interfaces
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-amber-600 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Seed phrases that people lose or forget
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-amber-600 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Requires expensive smartphones and data
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-amber-600 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    High fees for small transactions
                  </p>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div
              className={`transition-all duration-1000 ease-out delay-400 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}>
              <h3 className="text-xl font-medium text-slate-800 mb-6">
                Our solution
              </h3>
              <div className="space-y-4">
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-teal-700 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Use WhatsApp or USSD - tools you already know
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-teal-700 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Your phone number is your wallet
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-teal-700 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Works on any phone, even without internet
                  </p>
                </div>
                <div className="flex items-start group">
                  <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-teal-700 transition-colors duration-200"></div>
                  <p className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                    Low fees, fast transactions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
