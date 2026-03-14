import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const FohHeroSection = () => (
  <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 mb-10 bg-gradient-to-br from-primary/90 to-primary">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-primary-foreground/70 text-sm font-medium tracking-wide uppercase">
          FOH Staff Training
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
        Table Service Steps
      </h1>
      <p className="text-primary-foreground/70 text-base md:text-lg max-w-xl leading-relaxed">
        Follow each step to deliver an exceptional dining experience. Tap any step to expand the detailed instructions.
      </p>
    </motion.div>
  </div>
);

export default FohHeroSection;
