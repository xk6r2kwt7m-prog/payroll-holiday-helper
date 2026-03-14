import { Eye, Heart, Coffee, Baby, Clock, HelpCircle, Utensils, MessageCircle, Sparkles, TrendingUp, Wine, Sun, Moon, ShoppingBasket } from "lucide-react";

export interface UpsellingSection {
  id: number;
  title: string;
  icon: typeof Eye;
  content: string[];
  listItems?: string[];
  highlight?: boolean;
}

export const upsellingSections: UpsellingSection[] = [
  {
    id: 1,
    title: "Comfort First, Sales Follow",
    icon: Heart,
    highlight: true,
    content: [
      "Upselling is never about pushing products — it's about making every customer feel so comfortable that they naturally want to stay longer, order more, and come back again.",
      "When customers feel genuinely cared for, they spend more. Your job is to create an environment where ordering more feels like a treat, not a transaction.",
    ],
  },
  {
    id: 2,
    title: "Reading the Room",
    icon: Eye,
    content: [
      "The best servers don't wait to be asked — they observe and anticipate. Develop your ability to read body language, facial expressions, and energy levels at each table.",
    ],
    listItems: [
      "Tired customers — If someone looks exhausted (long day, travelling), offer a refreshing drink immediately: \"You look like you could use something refreshing — can I get you a cold drink or a nice cup of tea to start?\"",
      "Excited groups — High-energy tables are primed for sharing plates and extras. Suggest platters or our dumpling selection to share.",
      "Quiet couples — Give space but stay attentive. A well-timed dessert suggestion after mains can extend their evening.",
      "Solo diners — They may feel self-conscious. Make them feel welcome and suggest dishes that work well for one.",
    ],
  },
  {
    id: 3,
    title: "Families & Children",
    icon: Baby,
    content: [
      "When customers arrive with children, proactively make them comfortable. This builds immediate trust and makes the whole family more relaxed — and more likely to order freely.",
    ],
    listItems: [
      "Table choice — Offer a more cornered or secluded table: \"Would you prefer this table in the corner? It's a bit more spacious for the little ones.\"",
      "Kids' needs first — Ask about children's food or drink needs early. Parents appreciate not having to chase you for it.",
      "Patience — Families take longer to settle. Don't rush them. Check back gently after they've had time to look at the menu.",
      "Suggest shareable items — Dumplings are perfect for families. Suggest a mix: \"Kids usually love the cheeseburger dumplings — shall I add a few to share?\"",
    ],
  },
  {
    id: 4,
    title: "Anticipate Ordering Timing",
    icon: Clock,
    content: [
      "Knowing when a customer is ready to order — without being asked — is a crucial skill. It shows attentiveness and keeps the service flowing smoothly.",
    ],
    listItems: [
      "Menu closed — When customers close their menus or put them down, they're likely ready. Approach promptly.",
      "Eye contact — If a customer is looking around the room, they may be trying to get your attention. Don't make them wait.",
      "Group consensus — Watch for groups nodding or pointing at menus together. That's your cue.",
      "Don't hover — Being too close too early creates pressure. Give them time, then approach with: \"Have you had a chance to decide, or would you like a recommendation?\"",
    ],
  },
  {
    id: 5,
    title: "Portion Guidance for First-Timers",
    icon: ShoppingBasket,
    highlight: true,
    content: [
      "Many first-time customers don't know how much to order. It's your job to guide them to the right amount so they leave satisfied — not hungry, not overwhelmed. A good recommendation is approximately 3 portions of dumplings (about 9 dumplings) plus a side dish per person.",
    ],
    listItems: [
      "The golden ratio — Suggest 3 portions of dumplings + 1 side (noodles, tempura, or cucumber salad) per person. This is the sweet spot for a satisfying meal.",
      "Spot the under-order — If a customer orders only 2 portions, that's usually not enough. Step in: \"Just so you know, most of our guests find 3 portions with a side is perfect — shall I add a portion of prawns & chive to round it off?\"",
      "Be specific — Don't just say \"would you like more?\" Suggest a specific dish: \"You've got chicken and cheeseburger — the prawns & chive would be a great third to complete the set.\"",
      "Dessert bridge — If they won't add a third portion, pivot to dessert: \"No worries — but do save room for our apple pie dumplings, they're incredible.\"",
    ],
  },
  {
    id: 6,
    title: "Lunchtime vs Evening Strategy",
    icon: Sun,
    content: [
      "Your upselling approach must change depending on the time of day. Lunchtime customers want speed and value. Evening customers are there to enjoy themselves and are open to spending more.",
    ],
    listItems: [
      "Lunch (before 5pm, Mon–Fri) — Meal deals are king. Both gluten-free and regular meal deals are available. Don't suggest sides — there's no point as the deal already covers their meal. Instead, focus on upselling drinks and desserts.",
      "Lunch drink push — Lunchtime customers want quick and cheap, so push drinks as add-ons: \"Can I get you a drink to go with your meal deal?\" This is your main upsell opportunity at lunch.",
      "Evening (after 5pm) — Meal deals are no longer available. Customers order platters or individual portions. This is when portion guidance matters most — suggest 3 portions + a side.",
      "Evening extras — Evening diners are more relaxed and open to extras. Suggest sharing platters, additional sides, desserts, and multiple rounds of drinks.",
    ],
  },
  {
    id: 7,
    title: "Drink Upselling Mastery",
    icon: Wine,
    highlight: true,
    content: [
      "Drinks are one of the highest-margin items. Smart drink upselling can significantly boost the bill without the customer feeling pressured. The key rules: always default to the largest size, and always suggest the same drink they're already enjoying.",
    ],
    listItems: [
      "Default to large — If a customer asks for wine without specifying a size, assume large. You can say: \"I'll get you a large glass — is that alright?\" Most customers will simply agree.",
      "The 10–15% rule — Watch glasses carefully. When a drink is about 10–15% from finished, that's your moment. Approach and suggest another: \"Can I get you another one of those?\"",
      "Match the drink — Be specific. If they had a draught beer, suggest another draught beer. If they had a margarita, suggest another margarita. Customers want you to know what they like: \"Another margarita for you?\"",
      "Never let a glass sit empty — An empty glass is a missed sale. Get there before it's fully empty. This alone is the single biggest driver of drink revenue.",
      "Natural pauses — Offer drinks at every natural pause: when they sit down, after ordering food, between courses, and after dessert. Each is an opportunity.",
    ],
  },
  {
    id: 8,
    title: "Spotting the Second Order",
    icon: Utensils,
    content: [
      "The biggest revenue opportunity is the second order — additional dishes, sides, or drinks after the initial order. This is where emotional intelligence pays off.",
    ],
    listItems: [
      "Plate speed — If plates are cleared quickly, customers are hungry and enjoying the food. Suggest more: \"Those went fast! Would you like to try another round or something different?\"",
      "Lingering — If customers are relaxed and chatting after eating, suggest desserts or more drinks. They're in no rush.",
      "Small orders — If a table ordered conservatively, check in after the first dish: \"How's everything? Would you like to add anything else? Our dumplings are great for sharing.\"",
      "Drink refills — Never let a glass sit empty. Offer refills before they need to ask. This alone boosts drink sales significantly.",
    ],
  },
  {
    id: 9,
    title: "Reading Customer Satisfaction",
    icon: MessageCircle,
    content: [
      "Not every customer will tell you when something is wrong. Learn to spot the subtle signs so you can fix issues before they become complaints.",
    ],
    listItems: [
      "Food left on plate — If a dish comes back barely touched, ask gently: \"Was everything okay with that? Can I get you something else instead?\"",
      "Confused expressions — If customers look puzzled when food arrives, explain the dish proactively. They may have expected something different.",
      "Quiet tables — If a table that was chatty goes quiet after food arrives, check in. Silence after food can mean disappointment.",
      "Body language — Pushed-back chairs, crossed arms, or looking at phones instead of food can signal discomfort. Address it warmly.",
    ],
  },
  {
    id: 10,
    title: "Helping Without Being Asked",
    icon: HelpCircle,
    content: [
      "Anticipating customer needs before they ask is the hallmark of exceptional service. It creates trust and makes customers feel truly looked after.",
    ],
    listItems: [
      "Napkins & cutlery — If you see a spill or messy dish, bring extra napkins without being asked.",
      "Temperature — If a customer looks cold, offer to adjust seating or bring a warm drink.",
      "Directions & info — Be ready to help with local recommendations, taxi numbers, or wifi passwords.",
      "Pace of service — If a table seems rushed (checking watches, asking for the bill early), speed up. If they're relaxed, slow down and let them enjoy.",
    ],
  },
  {
    id: 11,
    title: "Star Dish Recommendations",
    icon: TrendingUp,
    highlight: true,
    content: [
      "Based on customer reviews and ratings, these are our strongest dishes for recommendations. Use this knowledge to guide customers toward dishes they'll love:",
    ],
    listItems: [
      "Apple Pie Dumplings (★ 8.0/10) — Our hidden gem. Many customers don't expect a dessert dumpling to be this good. Push this as a \"must-try\": \"Our apple pie dumplings are honestly one of the best things on the menu — have you tried them?\"",
      "Satay Chicken — Consistently praised in reviews. A safe recommendation for first-timers: \"If it's your first visit, the satay chicken is a customer favourite.\"",
      "Pork Belly — Highly rated for flavour. Mention the unexpected fish sauce element as a talking point.",
      "Tempura Aubergine — A strong vegetarian option. Recommend to customers looking for something lighter.",
      "Laksa Noodle Soup (★ 5.5/10) — Our lowest-rated dish. If a customer orders this, manage expectations: explain it's a lighter, more brothy laksa. If they want something heartier, suggest dumplings or noodles instead.",
    ],
  },
  {
    id: 12,
    title: "Natural Upselling Phrases",
    icon: Sparkles,
    content: [
      "The right words make all the difference. Use genuine enthusiasm, not scripted pitches. Here are proven phrases that feel natural:",
    ],
    listItems: [
      "\"Have you tried our dumplings before? I'd recommend starting with the Satay Chicken — it's one of our favourites.\" — Personal recommendations always outperform menu descriptions.",
      "\"That pairs really well with our homemade chilli sauce — shall I bring some over?\" — Pairing suggestions feel helpful, not pushy.",
      "\"A lot of our regulars love finishing with the apple pie dumplings — they're homemade and honestly incredible.\" — Social proof (\"our regulars\") makes suggestions more compelling.",
      "\"Can I get you another drink while you decide?\" — Always offer drinks at natural pauses. It's service, not selling.",
    ],
  },
  {
    id: 13,
    title: "The Golden Rule",
    icon: Heart,
    highlight: true,
    content: [
      "Comfortable customers buy more. Every action you take should be driven by one question: \"Is this customer as comfortable as they can be?\"",
      "If the answer is yes, the upselling takes care of itself. If the answer is no, fix the comfort issue first — the sale will follow.",
      "Research shows that restaurants focusing on guest comfort and emotional connection see 20–30% higher average check sizes compared to those using aggressive upselling tactics.",
    ],
  },
];
