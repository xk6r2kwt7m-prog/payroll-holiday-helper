import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_DATA = [
  {
    q: "What does UGLŌ do?",
    a: "UGLŌ is a workforce management platform built specifically for hospitality. It brings scheduling, payroll, holiday tracking, employee records, onboarding, training, and hiring into one system — replacing scattered spreadsheets and group chats.",
  },
  {
    q: "Who is it for?",
    a: "Restaurant groups, cafés, bars, hotels, and any hospitality operator that needs to manage staff, schedules, and payroll without the overhead of enterprise HR software.",
  },
  {
    q: "Why is it better than spreadsheets and WhatsApp?",
    a: "Spreadsheets drift, messages get lost, and nothing connects. UGLŌ gives you a single place where rotas, hours, holiday balances, and payroll data are linked — so you spend less time chasing and more time operating.",
  },
  {
    q: "Is it suitable for small and growing businesses?",
    a: "Yes. The system is designed to work for a single-site team and scale as you grow to multiple locations. You only use the modules you need.",
  },
  {
    q: "Can staff use it on mobile?",
    a: "Absolutely. The platform is mobile-first — staff can view schedules, clock in, request holidays, and manage their profile directly from their phone.",
  },
  {
    q: "How does the Talent Pool work?",
    a: "Former hospitality staff can opt into the Talent Pool to make themselves discoverable to employers. Employers can browse profiles, post vacancies, and receive applications — all with built-in privacy controls.",
  },
  {
    q: "Are inbound applications free?",
    a: "Yes. Posting vacancies and receiving applications is completely free. Employers only pay when they want to proactively reach out to passive candidates who haven't applied.",
  },
  {
    q: "When do employers pay?",
    a: "Only for outbound contact with passive Talent Pool candidates. Everything else — vacancy posting, inbound applications, employer replies, scheduling, and team management — is included in the platform.",
  },
  {
    q: "How does candidate privacy work?",
    a: "Candidates control their own visibility. Profiles show first name and surname initial only. Full identity is only revealed when a candidate chooses to engage with a specific employer.",
  },
  {
    q: "Is company data kept separate?",
    a: "Yes. Each company operates in a fully isolated workspace. Your employees, payroll, schedules, and documents are never visible to other organisations on the platform.",
  },
  {
    q: "How secure is the platform?",
    a: "The system uses role-based access controls, encrypted data transfer, tenant-separated storage, and audit logging for sensitive actions. Payroll and personal data are masked by default and only revealed through intentional interaction.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are up and running within an hour. You create an account, add your employees, and start building your first rota. Onboarding guides walk you through each step.",
  },
  {
    q: "Can I try it before rolling it out fully?",
    a: "Yes. You can set up your workspace, add a few team members, and explore the system before committing to a full rollout. There's no pressure to activate every module immediately.",
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
