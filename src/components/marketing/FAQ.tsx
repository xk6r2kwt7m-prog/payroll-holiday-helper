import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_DATA = [
  {
    q: "Can I still use Deputy while using UglyOps?",
    a: "Yes. Many teams start by running UglyOps alongside existing tools like Deputy. You can transition scheduling at your own pace while using UglyOps for employee records, compliance, holidays and payroll.",
  },
  {
    q: "How does payroll work with timesheets?",
    a: "You upload timesheets as CSV files. UglyOps lets you review hours, apply corrections, approve the pay run and export for processing. Payroll is currently timesheet-based — it does not pull from rota or clock-in data automatically.",
  },
  {
    q: "How do staff get access?",
    a: "Staff access is invitation-based. A manager adds the employee record, then sends an invitation email. The staff member clicks the link to set up their access. There is no open public signup.",
  },
  {
    q: "Can I manage multiple locations?",
    a: "Yes. You can set up multiple sites, assign employees to branches, and manage rotas, compliance and leave per location — all from one account.",
  },
  {
    q: "How does onboarding work?",
    a: "After adding a new employee, you send them an invitation. They complete their personal details, emergency contact, bank information and document uploads through a guided setup flow. You review and approve before they go live.",
  },
  {
    q: "Is company data kept separate?",
    a: "Yes. Each company operates in its own isolated workspace. Your data is never visible to other organisations.",
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
          <AccordionItem key={i} value={`faq-${i}`} className="border-border group/faq">
            <AccordionTrigger className="text-sm font-medium text-foreground text-left hover:no-underline py-4 hover:text-primary/80 transition-colors duration-200">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
