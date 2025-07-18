"use client";

import { MessageCircle, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer id="about" className="bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="relative mb-4 inline-block">
              <div className="absolute top-1 left-0 h-1 w-5 -translate-y-1 rounded-full bg-gradient-to-r from-[#3199f7] to-[#1d293d]" />
              <div className="text-3xl font-bold bg-gradient-to-r from-[#3199f7] to-[#1d293d] bg-clip-text text-transparent">
                Zest
              </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Making crypto accessible through familiar communication channels.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-medium text-slate-800 mb-4">Get started</h3>
            <div className="space-y-3">
              <button
                className="flex items-center text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm group"
                onClick={() =>
                  window.open("https://wa.me/1234567890?text=START", "_blank")
                }>
                <MessageCircle className="w-4 h-4 mr-2 group-hover:text-teal-600 transition-colors duration-200" />
                WhatsApp
              </button>
              <div className="flex items-center text-slate-600 text-sm group">
                <Phone className="w-4 h-4 mr-2 group-hover:text-teal-600 transition-colors duration-200" />
                USSD: *777#
              </div>
              <div className="flex items-center text-slate-600 text-sm group">
                <Mail className="w-4 h-4 mr-2 group-hover:text-teal-600 transition-colors duration-200" />
                hello@zest.com
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-medium text-slate-800 mb-4">Company</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm hover:translate-x-1 transform">
                Privacy Policy
              </a>
              <a
                href="#"
                className="block text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm hover:translate-x-1 transform">
                Terms of Service
              </a>
              <a
                href="#"
                className="block text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm hover:translate-x-1 transform">
                Support
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-8 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 Zest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
