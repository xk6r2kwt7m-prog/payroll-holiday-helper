import { SmilePlus, BookOpen, ClipboardList, Utensils, Clock, UtensilsCrossed, Lightbulb, Receipt } from "lucide-react";

export interface SubStep {
  text: string;
  tip?: string;
  allergenNote?: boolean;
}

export interface ServiceStep {
  id: number;
  title: string;
  icon: typeof SmilePlus;
  color?: string;
  timing?: string;
  substeps: SubStep[];
}

export const serviceSteps: ServiceStep[] = [
  {
    id: 1,
    title: "Warm Welcome",
    icon: SmilePlus,
    timing: "Immediately on arrival",
    substeps: [
      { text: "Greet the customer with a warm and friendly smile — maintain eye contact to make them feel welcome the moment they walk in." },
      { text: "Ask if they have a reservation or if they are a walk-in." },
      { text: "Use their name if they have a reservation: \"Welcome, Mr./Ms. [Name]! Great to see you.\"", tip: "Personal touch makes a big difference." },
    ],
  },
  {
    id: 2,
    title: "Reservation & Walk-Ins",
    icon: BookOpen,
    substeps: [
      { text: "If the customer has a reservation, escort them to their table." },
      { text: "Let them know they can scan the QR code on the table to view the menu." },
      { text: "Inform them that allergen information is available online and ask if anyone at the table has allergies.", allergenNote: true },
      { text: "If the customer is a walk-in, check table availability and let them know the estimated wait time." },
      { text: "For walk-ins with a wait, offer to take their name and phone number and suggest the bar area if available." },
    ],
  },
  {
    id: 3,
    title: "Order Taking",
    icon: ClipboardList,
    timing: "Allow 5–10 minutes to browse",
    substeps: [
      { text: "Let the customer know: \"I'll be back shortly to take your order — take your time!\"" },
      { text: "Return and ask: \"Are you ready to order, or do you need a little more time?\"" },
      { text: "Before taking the order, ask about allergies. If they have one, ask how severe it is.", allergenNote: true },
      { text: "Repeat all stated allergies back to the customer clearly: \"So you have an allergy to [X] and [Y] — is that correct?\" Wait for confirmation before proceeding.", allergenNote: true },
      { text: "Help the customer place their order. If they haven't selected a side, suggest one: \"Would you like to add our house rice or steamed greens?\"" },
      { text: "Repeat the entire order back to confirm accuracy." },
      { text: "If there is any change to an existing order, reprint a new ticket and verbally inform the kitchen it's a replacement — not a new order — to prevent duplicates.", allergenNote: true },
      { text: "Let the customer know: \"Your food should be with you in about 15 minutes.\"" },
    ],
  },
  {
    id: 4,
    title: "Sauces & Chopsticks",
    icon: Utensils,
    timing: "Immediately after order",
    substeps: [
      { text: "Bring homemade chilli sauce, gluten-free soy sauce, and regular soy sauce to the table." },
      { text: "Offer chopsticks and ensure standard cutlery is also available." },
      { text: "Mention which sauces are gluten-free for customers with dietary requirements.", allergenNote: true },
    ],
  },
  {
    id: 5,
    title: "Check-Ins",
    icon: Clock,
    timing: "10–15 min after ordering, then ongoing",
    substeps: [
      { text: "After 10–15 minutes, check if the food is on the way from the kitchen." },
      { text: "If there's a delay, proactively inform the customer: \"Your meal is being freshly prepared and will be with you shortly.\"" },
      { text: "During their stay, check back on the table at least 4 times to see if they need anything." },
      { text: "Keep checks natural — don't interrupt mid-conversation. A quick glance and eye contact is often enough.", tip: "Read the table: some guests prefer minimal interaction." },
    ],
  },
  {
    id: 6,
    title: "Food Delivery",
    icon: UtensilsCrossed,
    substeps: [
      { text: "Bring the food to the table and place each dish in front of the correct guest if possible." },
      { text: "Explain each dish one by one as you place it down." },
      { text: "Highlight any allergen information or special dietary accommodations made for that dish.", allergenNote: true },
      { text: "Wish them \"Bon appétit!\" with a genuine smile." },
    ],
  },
  {
    id: 7,
    title: "Suggestions & Upselling",
    icon: Lightbulb,
    timing: "After main course is finished",
    substeps: [
      { text: "Once finished, clear the dirty plates promptly." },
      { text: "If they haven't tried the dumplings, suggest them: \"Have you had a chance to try our dumplings? They're one of our most popular dishes!\"" },
      { text: "If they don't want more food, suggest desserts: \"Can I tempt you with our homemade pecan pie?\"" },
      { text: "Check if they'd like more drinks." },
      { text: "If needed, politely advise how long they have at the table: \"Just to let you know, we have the table reserved from [time], so no rush but wanted to keep you informed.\"", tip: "Always frame time limits politely." },
    ],
  },
  {
    id: 8,
    title: "Bill & Feedback",
    icon: Receipt,
    substeps: [
      { text: "When ready, bring the bill to the table." },
      { text: "Before taking payment, kindly ask them to scan the QR code on the bill to leave a quick review." },
      { text: "Thank them warmly: \"It was a pleasure serving you today!\"" },
      { text: "Wish them a good afternoon or evening as they leave." },
    ],
  },
];
