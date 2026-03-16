import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_DATA = [
  {
    q: "What does UGLŌ do?",
    a: "It connects scheduling, payroll, training, compliance and operational follow-through in one platform built for restaurants, kitchens and multi-site hospitality teams.",
  },
  {
    q: "Who is it for?",
    a: "Restaurant operators, multi-site hospitality businesses, GMs, ops managers and directors who need stronger control over staffing, training, compliance and follow-through.",
  },
  {
    q: "How is this different from HR software?",
    a: "Generic HR tools manage employee records. UGLŌ connects workforce management with training, compliance and operational execution — so managers can see who is ready, what is overdue and what needs action.",
  },
  {
    q: "Does it replace our rota and payroll tools?",
    a: "It can. UGLŌ includes rota planning and UK payroll workflow support, plus training tracking, compliance governance and operational intelligence that standalone tools do not cover.",
  },
  {
    q: "Does it work for small teams?",
    a: "Yes. Single-site teams use it just as well as multi-site operators. Activate the modules you need.",
  },
  {
    q: "Can staff use it on mobile?",
    a: "Yes. Staff view schedules, clock in, manage training, request holidays and access their profile from any phone browser.",
  },
  {
    q: "How does training tracking work?",
    a: "Assign training, track completion, manage sign-off. Training status links to scheduling and readiness so you always know who is prepared and who is not.",
  },
  {
    q: "Is company data kept separate?",
    a: "Yes. Each company operates in its own tenant-isolated workspace. Your data is never visible to other organisations.",
  },
  {
    q: "How is it secured?",
    a: "Role-based access controls, tenant-separated storage, audit logging for sensitive actions and data masking for payroll and personal records.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are operational within an hour. Create an account, add employees and build your first rota.",
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
