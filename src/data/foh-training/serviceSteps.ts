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
      { text: "Greet every guest promptly with a warm, friendly smile and natural eye contact so they feel welcome as soon as they enter." },
      { text: "Ask whether they have a reservation or are visiting as a walk-in." },
    ],
  },
  {
    id: 2,
    title: "Reservation & Walk-Ins",
    icon: BookOpen,
    substeps: [
      { text: "For a reservation, show the guests to their table and explain that they can scan the QR code to view the menu." },
      { text: "Explain that allergen information is available online and ask guests to tell you about any allergies.", allergenNote: true },
      { text: "For a walk-in, explain whether a table is available and give an estimated waiting time when necessary." },
    ],
  },
  {
    id: 3,
    title: "Order Taking",
    icon: ClipboardList,
    timing: "Allow 5–10 minutes to browse",
    substeps: [
      { text: "Tell the guests that you will return shortly to take their order." },
      { text: "When you return, ask whether they need any help or are ready to order." },
      { text: "Before taking the order, ask about allergies. Check with the manager or kitchen team whenever confirmation is needed; never guess.", allergenNote: true },
      { text: "Help the guests place their order and suggest a side dish if they have not selected one." },
      { text: "Repeat the complete order back to the guests to confirm it is correct." },
      { text: "Let the guests know that their food should arrive in approximately 15 minutes." },
    ],
  },
  {
    id: 4,
    title: "Sauces & Chopsticks",
    icon: Utensils,
    timing: "Immediately after order",
    substeps: [
      { text: "Immediately after taking the order, bring the appropriate homemade chilli sauce, soy sauce and chopsticks to the table." },
      { text: "Make sure guests receive the correct sauce option for any stated dietary requirement. Check with the manager or kitchen team if you are unsure.", allergenNote: true },
    ],
  },
  {
    id: 5,
    title: "Check-Ins",
    icon: Clock,
    timing: "10–15 min after ordering, then ongoing",
    substeps: [
      { text: "After 10 to 15 minutes, check whether the food is on its way from the kitchen." },
      { text: "If there is a delay, tell the guests that their meal is being prepared and will arrive shortly." },
      { text: "Check the table four times during the visit to see whether the guests need anything." },
    ],
  },
  {
    id: 6,
    title: "Food Delivery",
    icon: UtensilsCrossed,
    substeps: [
      { text: "Bring the food to the table and explain each dish as you place it down." },
      { text: "Pay particular attention to stated allergies and special dietary requirements, and make sure the correct dish reaches the correct guest.", allergenNote: true },
      { text: "Wish the guests ‘bon appétit’ once the dishes have been served." },
    ],
  },
  {
    id: 7,
    title: "Suggestions & Upselling",
    icon: Lightbulb,
    timing: "After main course is finished",
    substeps: [
      { text: "When the guests have finished, clear the dirty plates promptly." },
      { text: "If they have not tried the dumplings, ask whether they would like to order some." },
      { text: "If they do not want more savoury food, offer dessert, such as pecan pie." },
      { text: "Ask whether they would like another drink." },
      { text: "When necessary, politely explain how long the table is available for." },
    ],
  },
  {
    id: 8,
    title: "Bill & Feedback",
    icon: Receipt,
    substeps: [
      { text: "Bring the bill when requested." },
      { text: "Before taking payment, politely invite the guests to scan the QR code on the bill and review their experience." },
      { text: "Thank the guests for visiting, say that it was a pleasure to serve them, and wish them a good afternoon or evening." },
    ],
  },
];
