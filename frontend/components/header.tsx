"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 z-[9999] transition-all duration-300 shadow-lg shadow-black/5  overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-40 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-purple-900/3 to-indigo-900/5"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute top-1 left-0 h-1 w-5 -translate-y-1 rounded-full bg-gradient-to-r from-primary to-blue-600" />
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                Zest
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("home")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm relative group font-medium">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm relative group font-medium">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm relative group font-medium">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm relative group font-medium">
              FAQs
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </button>
          </nav>

          {/* Theme Toggle and CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              onClick={() =>
                window.open("https://wa.me/+14155238886?text=HELP", "_blank")
              }>
              Get Started
            </Button>
          </div>

          {/* Mobile menu button and theme toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="p-2 hover:bg-muted rounded-lg transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}>
          <div className="py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => scrollToSection("home")}
                className="text-left text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm py-2 hover:bg-muted rounded px-2">
                Home
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-left text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm py-2 hover:bg-muted rounded px-2">
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="text-left text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm py-2 hover:bg-muted rounded px-2">
                Features
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-left text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm py-2 hover:bg-muted rounded px-2">
                FAQs
              </button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full mt-4 text-sm transition-all duration-200"
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
