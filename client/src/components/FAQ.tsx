import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqItems } from '@/lib/data';

const FAQ = ({ headingLevel = 'h2' }: { headingLevel?: 'h2' | 'h3' }) => {
  const Heading = headingLevel;
  return (
    <section aria-labelledby="faq-heading">
      <Heading id="faq-heading" className="mb-4 text-2xl font-semibold">
        Questions people ask
      </Heading>
      <Accordion type="single" collapsible className="border-t">
        {faqItems.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger className="text-left font-sans text-base font-medium hover:no-underline">{item.question}</AccordionTrigger>
            <AccordionContent className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FAQ;
