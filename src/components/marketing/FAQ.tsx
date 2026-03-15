import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_DATA = [
  {
    q: "What does UGLŌ do?",
    a: "UGLŌ brings scheduling, payroll, holiday tracking, employee records, onboarding, training, and hiring into one platform — designed specifically for hospitality teams.",
  },
  {
    q: "Who is it for?",
    a: "Restaurants, cafés, bars, hotels, and hospitality operators who need to manage staff, schedules, and payroll without enterprise-grade complexity.",
  },
  {
    q: "Why not just use spreadsheets?",
    a: "Spreadsheets drift, nothing connects, and chasing updates wastes time. UGLŌ links rotas, timesheets, holiday balances, and payroll in one place.",
  },
  {
    q: "Does it work for small teams?",
    a: "Yes. It's designed for a single-site team and scales to multiple locations. You only activate the modules you need.",
  },
  {
    q: "Can staff use it on mobile?",
    a: "Yes. The platform is mobile-first — staff can view schedules, clock in, request holidays, and manage their profile from any phone browser.",
  },
  {
    q: "How does the Talent Pool work?",
    a: "Hospitality workers can opt in to make themselves discoverable to employers. Employers can browse profiles, post vacancies, and receive applications — with built-in privacy controls throughout.",
  },
  {
    q: "Are inbound applications free?",
    a: "Yes. Posting vacancies and receiving applications costs nothing. Employers only pay when proactively reaching out to passive candidates.",
  },
  {
    q: "How does candidate privacy work?",
    a: "Candidates control their own visibility. Profiles display first name and surname initial only. Full identity is shared only when a candidate chooses to respond.",
  },
  {
    q: "Is company data kept separate?",
    a: "Yes. Each company operates in its own isolated workspace. Your employees, payroll, and documents are never visible to other organisations.",
  },
  {
    q: "How is the platform secured?",
    a: "The system includes role-based access controls, tenant-separated data storage, and audit logging for sensitive actions. Payroll and personal data are masked by default.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are up and running within an hour. Create an account, add your employees, and build your first rota. Guided steps walk you through each part.",
  },
  {
    q: "Can I try it before a full rollout?",
    a: "Yes. You can set up your workspace, add a few team members, and explore the system at your own pace. There's no obligation to activate every module upfront.",
  },
];

interface FAQProps {
  className?: string;
  limit?: number;
}

export function FAQ({ className, limit }: FAQProps) {
  const items = limit ? FAQ_DATA.slice(0, limit) : FAQ_DATA;

  return (
    <div className={className}>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border">
            <AccordionTrigger className="text-sm font-medium text-foreground text-left hover:no-underline py-4">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
