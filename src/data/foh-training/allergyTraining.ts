import { AlertTriangle, ShieldAlert, Users, BookOpen, List, Heart, FileText, ClipboardCheck, HelpCircle, Printer } from "lucide-react";

export interface AllergenDish {
  name: string;
  allergens: string[];
}

export interface TrainingSection {
  id: number;
  title: string;
  icon: typeof AlertTriangle;
  content: string[];
  listItems?: string[];
  highlight?: boolean;
}

export const allergenDishes: AllergenDish[] = [
  { name: "Pork Belly", allergens: ["Fish (Fish Sauce)"] },
  { name: "Aromatic Duck", allergens: ["Gluten (Dough)"] },
  { name: "Prawn & Chive", allergens: ["Crustacea (Prawn)"] },
  { name: "Satay Chicken", allergens: ["Peanuts", "Tree Nuts (Traces)"] },
  { name: "Spinach & Tofu", allergens: ["Gluten (Dough)", "Soy"] },
  { name: "Cheeseburger", allergens: ["Dairy", "Gluten (Dough)"] },
  { name: "Mushroom & Truffle", allergens: ["Dairy"] },
  { name: "Halloumi & Courgette", allergens: ["Dairy", "Gluten (Dough)"] },
  { name: "Sichuan Vegan 'Pork'", allergens: ["Soy", "Gluten (Dough)"] },
  { name: "Korean Beef Bulgogi Dumpling", allergens: ["Soy", "Gluten (Dough)"] },
  { name: "Ugly Varenyky", allergens: ["Gluten (Dough)"] },
  { name: "Curry Paneer", allergens: ["Dairy", "Gluten (Dough)"] },
  { name: "Nutella", allergens: ["Nuts", "Peanuts", "Dairy", "Gluten (Dough)"] },
  { name: "Pecan Pie", allergens: ["Nuts", "Gluten (Dough)"] },
  { name: "Apple Pie", allergens: ["Gluten (Dough)", "⚠️ Fryer cross-contamination (Nuts, Peanuts, Dairy, Eggs)"] },
  { name: "Ugly Noodles", allergens: ["Gluten", "Soy"] },
  { name: "Tempura Aubergine", allergens: ["Sesame", "Gluten (Garnish)"] },
  { name: "Cucumber Salad", allergens: ["Soy", "Sesame"] },
  { name: "Laksa Soup", allergens: ["Nuts (Candle Nut)", "Crustacea (Shrimp)"] },
  { name: "Homemade Chili Sauce", allergens: ["Sesame"] },
];

export const trainingSections: TrainingSection[] = [
  {
    id: 1,
    title: "Understanding Allergies",
    icon: BookOpen,
    content: [
      "An allergy occurs when the immune system reacts to a substance that is typically harmless to most people. These substances, known as allergens, can cause reactions ranging from mild to severe and can be life-threatening.",
      "The most common allergens include certain foods, medications, insect stings, and environmental factors such as pollen and dust mites.",
    ],
  },
  {
    id: 2,
    title: "Common Mistakes",
    icon: ShieldAlert,
    content: [
      "These are the most frequent mistakes made in allergy handling. Every team member must be aware of these to prevent incidents.",
    ],
    listItems: [
      "Cross-Contamination — Allergens unintentionally transferred via shared utensils, cutting boards, or cooking oils.",
      "Miscommunication — Failing to accurately communicate a customer's allergy to all relevant staff members.",
      "Labeling Errors — Incorrect or unclear labelling of food products leading to unknowing consumption.",
      "Complacency — Assuming an allergy is not severe or that small amounts are safe.",
    ],
  },
  {
    id: 3,
    title: "Dangers to Customers",
    icon: AlertTriangle,
    highlight: true,
    content: [],
    listItems: [
      "Anaphylaxis — A severe, potentially life-threatening reaction causing difficulty breathing, throat swelling, rapid pulse, and loss of consciousness.",
      "Chronic Health Issues — Repeated exposure can lead to chronic health problems and reduced quality of life.",
      "Customer Distrust — Failing to manage allergies erodes trust and damages our restaurant's reputation.",
    ],
  },
  {
    id: 4,
    title: "Impact on Team",
    icon: Users,
    content: [],
    listItems: [
      "Increased Responsibility — Staff must be vigilant and knowledgeable, which can increase workload and stress.",
      "Training Requirements — Continuous training is necessary to stay informed about allergy management.",
      "Team Cohesion — Mistakes or lapses in protocol can lead to blame and tension, impacting morale.",
    ],
  },
  {
    id: 5,
    title: "Key Allergens We Handle",
    icon: List,
    content: [
      "The following allergens are of particular concern and require strict handling procedures:",
    ],
    listItems: [
      "Gluten — Many customers seek gluten-free options. Our kitchen uses high amounts of wheat flour, making cross-contamination a serious risk.",
      "Sesame Seeds — Heavily used for garnishing, mixes, and sauces. Extreme care required.",
      "Peanuts — Used in our satay sauce (e.g., Satay Chicken). Nutella also contains peanuts.",
      "Tree Nuts — Found in pecan pie and Nutella dumplings. Communicate clearly to customers.",
      "Dairy — Present in Mushrooms & Truffle, Halloumi & Courgette, and more.",
      "Fish — Found in Pork Belly (contains fish sauce) — often unexpected by customers.",
    ],
  },
  {
    id: 6,
    title: "Allergen Orders – Key Steps",
    icon: ClipboardCheck,
    highlight: true,
    content: [
      "Follow these golden rules for every allergen order:",
    ],
    listItems: [
      "Check Severity First — Always ask the customer how severe their allergy is. This determines the level of caution required in the kitchen.",
      "Repeat Back & Confirm — After noting all allergies, repeat them back to the customer clearly: \"So you have an allergy to peanuts and dairy — is that correct?\" Wait for their confirmation before proceeding.",
      "Take Your Time — Ensure accuracy when taking allergen orders. Don't rush — get it right the first time.",
      "Cook with Care — Handle allergen orders with extra caution. Prevent any cross-contamination.",
      "Serve with Control — Be prompt but precise. Double-check allergen orders before serving.",
    ],
  },
  {
    id: 7,
    title: "Nuts vs Peanuts Protocol",
    icon: HelpCircle,
    highlight: true,
    content: [
      "Most customers do not differentiate between nuts and peanuts. When a customer mentions a \"nut allergy,\" immediately ask: \"Are you allergic to peanuts as well?\"",
      "This distinction is essential — peanuts (legumes) and tree nuts (hazelnuts, almonds, walnuts) are different allergens and require different handling.",
    ],
    listItems: [
      "Fryer Cross-Contamination — Items like apple pie, although they don't contain nuts, dairy, peanuts, or eggs, may be cooked in oil also used for items with these allergens. Always inform customers with these allergies about potential trace allergens.",
    ],
  },
  {
    id: 8,
    title: "Ticket Accuracy",
    icon: Printer,
    highlight: true,
    content: [
      "Ticket accuracy is non-negotiable for allergen safety.",
    ],
    listItems: [
      "No Unclear Tickets — If the order ticket does not clearly specify allergens, do NOT prepare the item. Return it to FoH and request a new ticket with correct allergen details.",
      "No Handwritten Notes — FoH staff must never add handwritten notes to printed tickets. Any updated allergen information requires a fresh ticket to be sent to the kitchen.",
      "Reprint for Any Change — If there is ANY change to a previous order, staff MUST reprint a new ticket with the correct information. Never modify an existing ticket.",
      "Prevent Duplicate Orders — When sending a corrected/reprinted ticket to the kitchen, ALWAYS verbally inform the kitchen that this is a replacement ticket, not a new order. Failure to do so can result in the kitchen preparing both the old and new tickets, leading to waste and confusion.",
      "Clear Communication — This ensures zero ambiguity between front and back of house and prevents potentially dangerous errors.",
    ],
  },
  {
    id: 9,
    title: "Plate Awareness & Dish Explanation",
    icon: FileText,
    highlight: true,
    content: [
      "Knowing which plate belongs to which dish is essential for allergen safety. Allergen-safe orders are served on black plates.",
    ],
    listItems: [
      "Black Plates = Allergen Orders — All allergen-safe dishes are plated on black plates. Staff must recognise this and handle them with extra care.",
      "Always Explain the Dish — When serving ANY dish, staff must explain what it is to the customer. This is a critical safety check — it prevents the wrong dish going to the wrong person, especially at tables with mixed allergen requirements.",
      "Identify Allergens Verbally — When placing a dish, clearly state what allergens it is free from: \"This is your gluten-free satay chicken on the black plate.\"",
      "Never Assume — Even if you're confident, always confirm with the ticket and the customer. One wrong plate can be life-threatening.",
    ],
  },
  {
    id: 10,
    title: "Our Safety Commitment",
    icon: Heart,
    highlight: true,
    content: [
      "We recognise past mistakes due to poor communication and not taking allergies seriously enough. Our Google reviews show we've improved significantly, but we must stay vigilant. To prevent incidents from recurring:",
    ],
    listItems: [
      "Give full attention when a customer has an allergy — avoid all distractions.",
      "Immediately inform colleagues and the manager when a table has an allergy.",
      "Double-check every order when picking up from the kitchen. Always read the ticket.",
      "Explain every dish to the customer at the table. Clearly identify allergens present.",
      "Be proud of our progress — customers regularly praise our allergy handling. Keep this standard.",
    ],
  },
];
