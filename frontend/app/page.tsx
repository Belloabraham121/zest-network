import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { ProblemSolution } from "@/components/problem-solution";
import { HowItWorks } from "@/components/how-it-works";
import { WhyZest } from "@/components/why-zest";
import { FAQ } from "@/components/faq";
import { CallToAction } from "@/components/call-to-action";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <ProblemSolution />
        <HowItWorks />
        <WhyZest />
        <FAQ />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
