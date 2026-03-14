import { useState } from "react";
import { ChevronDown, Printer, Lock } from "lucide-react";
import { serviceSteps } from "@/data/foh-training/serviceSteps";
import { trainingSections } from "@/data/foh-training/allergyTraining";
import { upsellingSections } from "@/data/foh-training/upsellingTraining";
import uglyDumplingLogo from "@/assets/ugly-dumpling-logo.jpeg";

const Section = ({
  title,
  children,
  forceOpen,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  forceOpen?: boolean;
  accent?: boolean;
}) => {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen ?? localOpen;
  return (
    <div className={`border rounded-lg overflow-hidden mb-3 print:mb-2 ${accent ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-card"} print:break-inside-avoid`}>
      <button
        onClick={() => setLocalOpen(!localOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left print:pointer-events-none"
      >
        <span className={`font-semibold text-sm md:text-base ${accent ? "text-destructive" : "text-primary"}`}>
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform print:hidden ${open ? "rotate-180" : ""} ${accent ? "text-destructive" : "text-primary"}`}
        />
      </button>
      <div className={`${open ? "block" : "hidden"} print:!block px-4 pb-4`}>
        {children}
      </div>
    </div>
  );
};

const FohPrintableTraining = () => {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setAllOpen(!allOpen)}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {allOpen ? "Collapse All" : "Expand All"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 print:py-4 print:px-8">
        <div className="text-center mb-8 print:mb-6">
          <img
            src={uglyDumplingLogo}
            alt="Ugly Dumpling Logo"
            className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-4 rounded-2xl print:w-24 print:h-24"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
            FOH Staff Training Guide
          </h1>
          <p className="text-primary/70 text-sm mt-1 font-medium tracking-widest uppercase">
            Ugly Dumpling
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-full">
            <Lock className="w-3 h-3" />
            CONFIDENTIAL — FOR STAFF USE ONLY
          </div>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            This document is the property of Ugly Dumpling and is intended solely for employees in the performance of their duties. Do not share, copy, or distribute.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-lg font-bold text-primary mb-3">
            Contents
          </h2>
          <ol className="space-y-1 text-sm text-foreground/80">
            <li className="font-semibold text-foreground">1. Service Steps</li>
            <li className="font-semibold text-foreground">2. Allergy & Food Safety Training</li>
            <li className="font-semibold text-foreground">3. Upselling & Guest Comfort</li>
          </ol>
        </div>

        {/* PART 1: SERVICE STEPS */}
        <div className="mb-10 print:mb-6">
          <div className="flex items-center gap-3 mb-4 print:mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <h2 className="text-2xl font-bold text-primary">
              Service Steps
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Follow these 8 steps for every customer interaction.
          </p>

          {serviceSteps.map((step) => (
            <Section key={step.id} title={`Step ${step.id}: ${step.title}${step.timing ? ` — ${step.timing}` : ""}`} forceOpen={allOpen || undefined}>
              <ul className="space-y-2">
                {step.substeps.map((sub, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm text-foreground">
                    <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                    <div>
                      <span>{sub.text}</span>
                      {sub.allergenNote && (
                        <span className="ml-1 text-destructive font-semibold text-xs">⚠ ALLERGY</span>
                      )}
                      {sub.tip && (
                        <span className="ml-1 text-primary text-xs italic">💡 {sub.tip}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>

        {/* PART 2: ALLERGY TRAINING */}
        <div className="mb-10 print:mb-6 print:break-before-page">
          <div className="flex items-center gap-3 mb-4 print:mb-3">
            <div className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm font-bold">2</div>
            <h2 className="text-2xl font-bold text-destructive">
              Allergy & Food Safety Training
            </h2>
          </div>
          <p className="text-sm text-destructive/60 mb-4">
            Every team member must know this. Lives depend on it.
          </p>

          {trainingSections.map((section) => (
            <Section key={section.id} title={`${section.id}. ${section.title}`} accent={section.highlight} forceOpen={allOpen || undefined}>
              {section.content.map((text, i) => (
                <p key={i} className="text-sm text-foreground mb-2 leading-relaxed">{text}</p>
              ))}
              {section.listItems && (
                <ul className="space-y-2 mt-2">
                  {section.listItems.map((item, i) => {
                    const [bold, ...rest] = item.split(" — ");
                    return (
                      <li key={i} className="flex gap-2 items-start text-sm text-foreground">
                        <span className={`font-bold mt-0.5 flex-shrink-0 ${section.highlight ? "text-destructive" : "text-primary"}`}>•</span>
                        <span>
                          <strong>{bold}</strong>
                          {rest.length > 0 && ` — ${rest.join(" — ")}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          ))}
        </div>

        {/* PART 3: UPSELLING */}
        <div className="mb-10 print:mb-6 print:break-before-page">
          <div className="flex items-center gap-3 mb-4 print:mb-3">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">3</div>
            <h2 className="text-2xl font-bold text-accent">
              Upselling & Guest Comfort
            </h2>
          </div>
          <p className="text-sm text-accent/70 mb-4">
            Comfortable customers buy more. Focus on care, and the sales follow.
          </p>

          {upsellingSections.map((section) => (
            <Section key={section.id} title={`${section.id}. ${section.title}`} accent={section.highlight} forceOpen={allOpen || undefined}>
              {section.content.map((text, i) => (
                <p key={i} className="text-sm text-foreground mb-2 leading-relaxed">{text}</p>
              ))}
              {section.listItems && (
                <ul className="space-y-2 mt-2">
                  {section.listItems.map((item, i) => {
                    const [bold, ...rest] = item.split(" — ");
                    return (
                      <li key={i} className="flex gap-2 items-start text-sm text-foreground">
                        <span className="text-accent font-bold mt-0.5 flex-shrink-0">•</span>
                        <span>
                          <strong>{bold}</strong>
                          {rest.length > 0 && ` — ${rest.join(" — ")}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          ))}
        </div>

        <div className="text-center pt-6 pb-8 border-t border-border print:pt-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ugly Dumpling — uglydumpling.co.uk
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            This document is confidential and intended for staff use only.
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:!block { display: block !important; }
          .print\\:break-before-page { break-before: page; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          @page { margin: 1.5cm; size: A4; }
        }
        @page { margin: 1.5cm; }
      `}</style>
    </div>
  );
};

export default FohPrintableTraining;
