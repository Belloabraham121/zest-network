"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function CallToAction() {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Generate floating particles
          const newParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 2,
          }));
          setParticles(newParticles);
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
      className="py-16 bg-slate-800 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-float-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}

        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-600 rounded-full opacity-10 blur-3xl animate-pulse-orb"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-600 rounded-full opacity-10 blur-3xl animate-pulse-orb"
          style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light mb-6 animate-text-glow">
              Ready to get started?
            </h2>
          </div>

          <div
            className={`transition-all duration-1000 ease-out delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <p className="text-lg text-slate-300 mb-12 animate-fade-in-delayed">
              Join millions using Zest to send, stake, and grow their crypto.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 ease-out delay-400 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                className="bg-white text-slate-800 hover:bg-slate-100 px-8 py-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105 relative overflow-hidden group animate-button-glow"
                onClick={() =>
                  window.open("https://wa.me/1234567890?text=START", "_blank")
                }>
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                <MessageCircle className="w-5 h-5 mr-2 animate-bounce-gentle relative z-10" />
                <span className="relative z-10">Start on WhatsApp</span>
              </Button>

              <div className="relative flex items-center justify-center group animate-dial-pulse px-4">
                <span className="text-slate-400 text-sm mr-3 group-hover:text-slate-300 transition-colors duration-200">
                  or dial
                </span>
                <span className="font-mono text-2xl group-hover:text-teal-300 transition-all duration-300 group-hover:scale-110 transform">
                  *777#
                </span>

                {/* Ripple effect */}
                <div className="absolute inset-0 border-2 border-teal-400 rounded-full opacity-0 group-hover:opacity-100 animate-ripple"></div>
              </div>
            </div>
          </div>

          {/* Success indicators */}
          <div
            className={`mt-12 transition-all duration-1000 ease-out delay-600 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="flex justify-center space-x-8 text-sm text-slate-400">
              <div className="flex items-center animate-success-indicator">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Instant Setup</span>
              </div>
              <div
                className="flex items-center animate-success-indicator"
                style={{ animationDelay: "0.2s" }}>
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Bank-Level Security</span>
              </div>
              <div
                className="flex items-center animate-success-indicator"
                style={{ animationDelay: "0.4s" }}>
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Works Everywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-particle {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }

        @keyframes pulse-orb {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.2;
          }
        }

        @keyframes text-glow {
          0%,
          100% {
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
          }
          50% {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
          }
        }

        @keyframes button-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
          }
        }

        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes dial-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes success-indicator {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float-particle {
          animation: float-particle 8s ease-in-out infinite;
        }

        .animate-pulse-orb {
          animation: pulse-orb 4s ease-in-out infinite;
        }

        .animate-text-glow {
          animation: text-glow 3s ease-in-out infinite;
        }

        .animate-button-glow {
          animation: button-glow 2s ease-in-out infinite;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        .animate-dial-pulse {
          animation: dial-pulse 3s ease-in-out infinite;
        }

        .animate-ripple {
          animation: ripple 1s ease-out;
        }

        .animate-success-indicator {
          animation: success-indicator 0.6s ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: success-indicator 0.8s ease-out 0.5s forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
