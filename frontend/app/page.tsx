import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { ProblemSolution } from "@/components/problem-solution";
import { HowItWorks } from "@/components/how-it-works";
import { WhyZest } from "@/components/why-zest";
import { FAQ } from "@/components/faq";
import { CallToAction } from "@/components/call-to-action";
import { Footer } from "@/components/footer";
import { WhatsAppAIDemo } from "@/components/whatsapp-ai-demo";
import { SMSDemo } from "@/components/sms-demo";
import { CrossChainFeatures } from "@/components/cross-chain-features";
import { WhatsAppCrossChainDemo } from "@/components/whatsapp-cross-chain-demo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProblemSolution />
        <HowItWorks />
        <WhatsAppAIDemo />
        <CrossChainFeatures />
        <WhatsAppCrossChainDemo />
        <SMSDemo />
        <WhyZest />
        <FAQ />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
