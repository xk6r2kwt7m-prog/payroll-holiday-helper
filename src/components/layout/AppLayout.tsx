import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — fixed, never re-renders on route change */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content with animated transitions */}
      <main className="md:ml-20 lg:ml-64 min-h-screen transition-[margin] duration-300">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="px-4 py-4 sm:px-6 sm:py-6 pb-24 md:pb-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
