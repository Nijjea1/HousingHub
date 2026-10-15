import { useState } from 'react';
import FAQ from '@/components/FAQ';
import { Input } from '@/components/ui/input';
import { HOUSING_SHARE_GUIDE, budget, type BudgetInput } from '@/lib/budget';

const sections = [
  ['before', 'Before you search'],
  ['viewing', 'At a viewing'],
  ['rights', 'Your rights in Ontario'],
  ['budget', 'What you can afford'],
  ['housemates', 'Living with housemates'],
  ['questions', 'Questions people ask'],
] as const;

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20 border-t pt-8" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="mb-4 text-2xl font-semibold">
      {title}
    </h2>
    <div className="space-y-4 text-[15px] leading-relaxed">{children}</div>
  </section>
);

const Points = ({ items }: { items: Array<[string, string]> }) => (
  <dl className="space-y-4">
    {items.map(([title, body]) => (
      <div key={title}>
        <dt className="font-medium">{title}</dt>
        <dd className="text-muted-foreground">{body}</dd>
      </div>
    ))}
  </dl>
);

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-CA')}`;

const Calculator = () => {
  const [input, setInput] = useState<BudgetInput>({ income: 2000, rent: 750, utilities: 100, otherExpenses: 600 });
  const result = budget(input);
  const fields: Array<[keyof BudgetInput, string, string]> = [
    ['income', 'Money you have each month', 'Work, savings, OSAP or family support'],
    ['rent', 'Rent', 'Your share, if you split it'],
    ['utilities', 'Utilities and internet', 'Zero if they are included'],
    ['otherExpenses', 'Everything else', 'Food, phone, transit, books'],
  ];
  const sharePct = result.share === null ? null : Math.round(result.share * 100);

  return (
    <div className="grid gap-6 rounded-lg border bg-card p-5 md:grid-cols-2 md:p-6">
      <div className="space-y-4">
        {fields.map(([key, label, hint]) => (
          <div key={key}>
            <label htmlFor={`budget-${key}`} className="text-sm font-medium">
              {label}
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
              <Input
                id={`budget-${key}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                className="pl-6 tabular-nums"
                value={input[key]}
                onChange={(e) => setInput({ ...input, [key]: Math.max(0, Number(e.target.value) || 0) })}
                aria-describedby={`budget-${key}-hint`}
              />
            </div>
            <p id={`budget-${key}-hint`} className="mt-1 text-xs text-muted-foreground">
              {hint}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 md:border-l md:pl-6" aria-live="polite">
        <div>
          <p className="eyebrow">Rent and utilities</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {sharePct === null ? 'n/a' : `${sharePct}%`}
            <span className="ml-2 text-base font-normal text-muted-foreground">of your monthly money</span>
          </p>
          <div className="relative mt-3 h-2 rounded-full bg-muted" aria-hidden="true">
            <div
              className={`h-2 rounded-full ${result.overGuide ? 'bg-destructive' : 'bg-success'}`}
              style={{ width: `${Math.min(sharePct ?? 100, 100)}%` }}
            />
            <div className="absolute -top-1 h-4 w-px bg-foreground" style={{ left: `${HOUSING_SHARE_GUIDE * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">The line marks 30%.</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Housing each month</dt>
            <dd className="text-lg font-medium tabular-nums">{money(result.housing)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Left after everything</dt>
            <dd className={`text-lg font-medium tabular-nums ${result.left < 0 ? 'text-destructive' : ''}`}>{money(result.left)}</dd>
          </div>
        </dl>
        <p className="mt-auto rounded-md bg-muted p-3 text-sm">
          {result.left < 0
            ? 'This budget runs short each month. Look for a cheaper place, split rent with housemates, or find utilities-included listings.'
            : result.overGuide
              ? `Housing is above 30%. That can work, but it leaves little room. Rent plus utilities of ${money(result.guideMax)} or less would be within it.`
              : 'Housing is within 30% of your monthly money, a common rule of thumb for staying comfortable.'}
        </p>
      </div>
    </div>
  );
};

const GuidelinesAndFAQ = () => (
  <div className="page py-10 md:py-14">
    <header className="mb-10 max-w-2xl">
      <p className="eyebrow mb-3">Guides</p>
      <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Renting near campus</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        What to sort out before you search, what to check when you visit, and the rules Ontario landlords have to follow.
      </p>
    </header>

    <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-20">
          <p className="eyebrow mb-3">On this page</p>
          <ol className="space-y-2 border-l text-sm">
            {sections.map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`} className="-ml-px block border-l border-transparent pl-3 text-muted-foreground hover:border-foreground hover:text-foreground">
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="max-w-3xl space-y-12">
        <Section id="before" title="Before you search">
          <Points
            items={[
              ['Set a budget', 'Count rent, utilities, internet, food, transit and books. Use the calculator below to see what rent fits.'],
              ['Decide what matters about location', 'A short walk to campus, a bus route, groceries nearby, or a quieter street. The map shows how far each place is from campus.'],
              ['Think about housemates', 'Sharing a house usually lowers rent. Talk about cleaning, guests, noise and how bills get split before you sign together.'],
              ['Start early', 'Most student leases follow the school year. Searching several months before term gives you more choice, and check whether a lease covers the summer.'],
            ]}
          />
        </Section>

        <Section id="viewing" title="At a viewing">
          <p className="text-muted-foreground">Go in person, or send someone you trust. Bring this list.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              'Working smoke and carbon monoxide alarms',
              'Locks on the doors and the windows that open',
              'Heat that works, and who controls it',
              'Signs of mould, leaks or pests',
              'Which utilities are included in the rent',
              'Internet speed and who pays for it',
              'Where you would study',
              'How repairs are requested, and how fast',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="rights" title="Your rights in Ontario">
          <div className="rounded-lg border-l-2 border-primary bg-card p-5">
            <ul className="space-y-3">
              <li>
                <span className="font-medium">Rent deposit:</span>{' '}
                <span className="text-muted-foreground">a landlord can ask for up to one month's rent, and it goes toward your last month.</span>
              </li>
              <li>
                <span className="font-medium">Key deposit:</span>{' '}
                <span className="text-muted-foreground">allowed, but it must be refundable when you return the keys.</span>
              </li>
              <li>
                <span className="font-medium">Damage deposits:</span>{' '}
                <span className="text-muted-foreground">not allowed, and you can't be required to pay several months up front.</span>
              </li>
              <li>
                <span className="font-medium">Standard lease:</span>{' '}
                <span className="text-muted-foreground">most private rentals must use Ontario's standard lease form. Ask for it in writing.</span>
              </li>
            </ul>
          </div>
          <p className="text-muted-foreground">
            Not sure about something? The{' '}
            <a href="https://tribunalsontario.ca/ltb/" className="text-primary underline underline-offset-4" target="_blank" rel="noreferrer">
              Landlord and Tenant Board
            </a>{' '}
            publishes guides for tenants. This page is general information, not legal advice.
          </p>
        </Section>

        <Section id="budget" title="What you can afford">
          <p className="text-muted-foreground">
            A common rule of thumb is to keep rent and utilities under 30% of the money you have each month. Your numbers stay
            in your browser.
          </p>
          <Calculator />
        </Section>

        <Section id="housemates" title="Living with housemates">
          <Points
            items={[
              ['Write it down', 'A short agreement on chores, quiet hours, guests and shared costs saves arguments later.'],
              ['Split bills the same way every month', 'Agree who pays what, and use one shared list or app so nobody fronts money for long.'],
              ['Talk early', 'A quick check-in every few weeks is easier than one big argument at the end of term.'],
              ['Get tenant insurance', 'Your landlord\'s insurance does not cover your belongings. Tenant insurance does, and some leases require it.'],
            ]}
          />
        </Section>

        <div id="questions" className="scroll-mt-20 border-t pt-8">
          <FAQ />
        </div>
      </div>
    </div>
  </div>
);

export default GuidelinesAndFAQ;
