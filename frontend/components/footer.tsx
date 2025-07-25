"use client";

import { MessageCircle, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer
      id="about"
      className="bg-gradient-to-b from-muted/30 via-background to-background/95 border-t border-border relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-40 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/3 to-indigo-900/5"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="relative mb-4 inline-block">
              <div className="absolute top-1 left-0 h-1 w-5 -translate-y-1 rounded-full bg-gradient-to-r from-[#3199f7] to-[#1d293d]" />
              <div className="text-3xl font-bold bg-gradient-to-r from-[#3199f7] to-[#1d293d] bg-clip-text text-transparent">
                Zest
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Making crypto accessible through familiar communication channels.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-medium text-foreground mb-4">Get started</h3>
            <div className="space-y-3">
              <button
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm group cursor-pointer"
                onClick={() =>
                  window.open(
                    "https://wa.me/+1415523-8886?text=START",
                    "_blank"
                  )
                }>
                <MessageCircle className="w-4 h-4 mr-2 group-hover:text-primary transition-colors duration-200" />
                WhatsApp
              </button>
              <div className="flex items-center text-muted-foreground text-sm group">
                <Phone className="w-4 h-4 mr-2 group-hover:text-primary transition-colors duration-200" />
                USSD: *777#
              </div>
              <div className="flex items-center text-muted-foreground text-sm group">
                <Mail className="w-4 h-4 mr-2 group-hover:text-primary transition-colors duration-200" />
                hello@zest.com
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-medium text-foreground mb-4">Company</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform cursor-pointer">
                Privacy Policy
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform cursor-pointer">
                Terms of Service
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm hover:translate-x-1 transform cursor-pointer">
                Support
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 Zest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
