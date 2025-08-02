"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Users, Smartphone, Shield, Zap, Globe, Heart } from "lucide-react";

export function WhyZest() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMousePosition({ x: x * 0.1, y: y * 0.1 });
  };

  const benefits = [
    {
      icon: Users,
      title: "For everyone",
      description: "Works on any phone, with or without internet access.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
    {
      icon: Smartphone,
      title: "Simple to use",
      description: "No apps to download, no seed phrases to remember.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Bank-level security with your phone number as your key.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
    {
      icon: Zap,
      title: "Fast & cheap",
      description: "Low fees and quick transactions on blockchain.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
    {
      icon: Globe,
      title: "Built for Africa & LATAM",
      description: "Designed for emerging markets and local needs.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
    {
      icon: Heart,
      title: "Financial inclusion",
      description: "Bringing crypto to the unbanked and underbanked.",
      color: "text-primary bg-primary/10",
      gradient: "from-primary/10 to-primary/20",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-16 bg-gradient-to-b from-background via-background to-background/95 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-60 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-indigo-900/5"></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Floating background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-primary/30 rounded-full animate-float-1"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-muted-foreground/30 rounded-full animate-float-2"></div>
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-float-3"></div>
        <div className="absolute bottom-40 right-1/3 w-4 h-4 bg-primary/30 rounded-full animate-float-1"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              Why choose Zest
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`text-center group cursor-pointer transition-all duration-500 ease-out ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: `${index * 100 + 200}ms`,
                  transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
                }}
                onMouseMove={(e) => handleMouseMove(e)}
                onMouseLeave={() => setMousePosition({ x: 0, y: 0 })}>
                <div className="bg-card p-8 rounded-2xl border border-border hover:border-border/80 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-4 hover:rotate-1 group-hover:scale-105 relative overflow-hidden">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Floating particles on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 right-4 w-1 h-1 bg-current rounded-full animate-ping"></div>
                    <div
                      className="absolute bottom-4 left-4 w-1 h-1 bg-current rounded-full animate-ping"
                      style={{ animationDelay: "0.5s" }}></div>
                  </div>

                  <div className="relative z-10">
                    <div
                      className={`w-16 h-16 ${benefit.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative overflow-hidden`}>
                      <benefit.icon className="w-8 h-8 relative z-10" />
                      <div className="absolute inset-0 bg-background opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>

                    <h3 className="text-lg font-medium text-foreground mb-3 group-hover:text-foreground transition-colors duration-200">
                      {benefit.title}
                    </h3>

                    <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-foreground transition-colors duration-200">
                      {benefit.description}
                    </p>
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-background to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full animate-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-1 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          33% {
            transform: translateY(-10px) translateX(5px);
          }
          66% {
            transform: translateY(5px) translateX(-5px);
          }
        }

        @keyframes float-2 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-15px) translateX(10px);
          }
        }

        @keyframes float-3 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-8px) translateX(-8px);
          }
          75% {
            transform: translateY(8px) translateX(8px);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }

        @keyframes drift {
          0% {
            transform: translateX(0) translateY(0);
          }
          100% {
            transform: translateX(-60px) translateY(-60px);
          }
        }

        .animate-float-1 {
          animation: float-1 6s ease-in-out infinite;
        }

        .animate-float-2 {
          animation: float-2 8s ease-in-out infinite;
        }

        .animate-float-3 {
          animation: float-3 7s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out;
        }
      `}</style>
    </section>
  );
}
