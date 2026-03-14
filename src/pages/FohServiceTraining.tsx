import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FohHeroSection from "@/components/foh-training/FohHeroSection";
import ServiceStepCard from "@/components/foh-training/ServiceStepCard";
import { serviceSteps } from "@/data/foh-training/serviceSteps";
import { AppLayout } from "@/components/layout/AppLayout";

const FohServiceTraining = () => {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          to="/staff"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff Portal
        </Link>

        <FohHeroSection />

        <div className="space-y-3">
          {serviceSteps.map((step, index) => (
            <ServiceStepCard key={step.id} step={step} index={index} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/foh/allergy" className="text-sm font-medium text-destructive hover:underline">
            Allergy Safety Guide →
          </Link>
          <Link to="/foh/upselling" className="text-sm font-medium text-accent hover:underline">
            Upselling & Guest Comfort →
          </Link>
          <Link to="/foh/print" className="text-sm font-medium text-muted-foreground hover:underline">
            Print Full Guide →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default FohServiceTraining;
