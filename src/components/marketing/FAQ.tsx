import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_DATA = [
  {
    q: "What does UGLŌ do?",
    a: "UGLŌ is a hospitality workforce operations platform. It brings scheduling, payroll, training, compliance, employee records and operational intelligence into one system built for restaurants, kitchens and multi-site hospitality teams.",
  },
  {
    q: "Who is it for?",
    a: "Restaurant operators, multi-site hospitality businesses, operations managers, general managers and directors who need stronger control over staffing, training, compliance and operational follow-through.",
  },
  {
    q: "How is this different from a standard HR system?",
    a: "Generic HR tools manage employee records. UGLŌ connects workforce management with training, compliance and operational execution so managers can see who is ready, what is overdue, where standards are slipping and what needs follow-up.",
  },
  {
    q: "Does it replace our rota and payroll tools?",
    a: "It can. UGLŌ includes scheduling, rota planning and UK payroll workflow support. But it also adds training tracking, compliance governance and operational intelligence that standalone rota or payroll tools do not provide.",
  },
  {
    q: "Does it work for small teams?",
    a: "Yes. It is designed for single-site teams and scales to multiple locations. You activate the modules you need.",
  },
  {
    q: "Can staff use it on mobile?",
    a: "Yes. The platform is mobile-first. Staff can view schedules, clock in, manage training, request holidays and access their profile from any phone browser.",
  },
  {
    q: "How does training tracking work?",
    a: "You assign training, track completion and manage sign-off. The system links training status to scheduling and operational readiness so managers can see who is prepared and who is not.",
  },
  {
    q: "Is company data kept separate?",
    a: "Yes. Each company operates in its own tenant-isolated workspace. Your employees, payroll and documents are never visible to other organisations.",
  },
  {
    q: "How is the platform secured?",
    a: "The system includes role-based access controls, tenant-separated data storage, audit logging for sensitive actions and data masking for payroll and personal records.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are operational within an hour. Create an account, add employees and start building your first rota. Guided steps walk you through each module.",
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
