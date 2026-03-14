import { motion } from "framer-motion";
import { allergenDishes } from "@/data/foh-training/allergyTraining";

const allergenColors: Record<string, string> = {
  Gluten: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Dairy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Peanuts: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Nuts: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Soy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Sesame: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Fish: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  Crustacea: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

const getBadgeClass = (allergen: string) => {
  for (const key of Object.keys(allergenColors)) {
    if (allergen.toLowerCase().includes(key.toLowerCase())) {
      return allergenColors[key];
    }
  }
  return "bg-muted text-muted-foreground";
};

const AllergenTable = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border/50 overflow-hidden bg-card"
    >
      <div className="p-4 md:p-5 bg-destructive/5 border-b border-border/50">
        <h3 className="text-lg font-semibold text-foreground">
          Dish Allergen Reference
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Quick-reference chart — memorise the allergens for dishes you serve most often.
        </p>
      </div>
      <div className="divide-y divide-border/30">
        {allergenDishes.map((dish, i) => (
          <motion.div
            key={dish.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-secondary/40 transition-colors"
          >
            <span className="text-sm font-medium text-foreground min-w-[180px]">
              {dish.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {dish.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeClass(allergen)}`}
                >
                  {allergen}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AllergenTable;
