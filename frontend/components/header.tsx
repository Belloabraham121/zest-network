"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute top-1 left-0 h-1 w-5 -translate-y-1 rounded-full bg-gradient-to-r from-[#3199f7] to-[#1d293d]" />
              <div className="text-3xl font-bold bg-gradient-to-r from-[#3199f7] to-[#1d293d] bg-clip-text text-transparent">
                Zest
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm relative group">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm relative group">
              FAQs
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all duration-200 group-hover:w-full"></span>
            </button>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button
              className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              onClick={() =>
                window.open("https://wa.me/+14155238886?text=HELP", "_blank")
              }>
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}>
          <div className="py-4 border-t border-slate-200">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => scrollToSection("home")}
                className="text-left text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm py-2 hover:bg-slate-50 rounded px-2">
                Home
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-left text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm py-2 hover:bg-slate-50 rounded px-2">
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="text-left text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm py-2 hover:bg-slate-50 rounded px-2">
                Features
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-left text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm py-2 hover:bg-slate-50 rounded px-2">
                FAQs
              </button>
              <Button
                className="bg-slate-800 hover:bg-slate-700 text-white w-full mt-4 text-sm transition-all duration-200"
                onClick={() =>
                  window.open("https://wa.me/+14155238886?text=HELP", "_blank")
                }>
                Get Started
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
