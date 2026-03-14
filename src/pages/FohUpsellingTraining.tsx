import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import TrainingSectionCard from "@/components/foh-training/TrainingSectionCard";
import { upsellingSections } from "@/data/foh-training/upsellingTraining";
import AppLayout from "@/components/layout/AppLayout";

const FohUpsellingTraining = () => {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          to="/foh/service"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Service Steps
        </Link>

        <div
          className="relative overflow-hidden rounded-2xl p-8 md:p-12 mb-10"
          style={{ background: "linear-gradient(135deg, hsl(25 30% 18%), hsl(25 65% 40%))" }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/70 text-sm font-medium tracking-wide uppercase">
                Skills Development
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Upselling & Guest Comfort
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
              Great upselling isn't about selling — it's about reading your customers, anticipating their needs, and making them so comfortable that ordering more feels natural.
            </p>
          </motion.div>
        </div>

        <div className="space-y-3 mb-8">
          {upsellingSections.map((section, index) => (
            <TrainingSectionCard key={section.id} section={section} index={index} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Remember: Comfortable customers buy more. Focus on care, and the sales follow.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default FohUpsellingTraining;
