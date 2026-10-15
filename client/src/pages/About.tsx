import { Link } from 'wouter';
import FAQ from '@/components/FAQ';

const does = [
  ['Distance first', 'Every listing is placed on the map, and searches can be limited to 1, 2, 5 or 10 km from campus.'],
  ['Plain-language search', 'Type "2 bedroom under $900 near campus" and the filters fill themselves in.'],
  ['Messages in one place', 'Students and landlords talk on the listing itself, with replies arriving live and an email when you are away.'],
  ['Saved listings and notes', 'Keep a shortlist, write private notes, and group places into collections.'],
];

const doesNot = [
  'We do not inspect properties. View a place in person before you agree to anything.',
  'We do not take payments or deposits. Never send money before you have seen the place and signed a lease.',
  'We do not verify landlords. Check that the person you meet can show you inside the place.',
];

const next = [
  ['Roommate matching', 'Find students with a similar budget who are looking for housemates.'],
  ['Viewing times', 'Book a time to see a place from its listing.'],
  ['More campuses', 'Other Canadian universities, once McMaster works well.'],
];

const About = () => (
  <article className="page max-w-3xl py-10 md:py-14">
    <p className="eyebrow mb-3">About</p>
    <h1 className="text-4xl font-semibold leading-tight md:text-5xl">A simpler way to rent near campus</h1>
    <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
      Student rentals near McMaster are spread across group posts, classifieds and word of mouth. LetMeKnock puts them in
      one place, measured by what students care about first: how far the walk to campus is.
    </p>

    <section className="mt-12" aria-labelledby="does-heading">
      <h2 id="does-heading" className="mb-5 text-2xl font-semibold">
        What it does
      </h2>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {does.map(([title, body]) => (
          <div key={title} className="border-t pt-4">
            <dt className="font-medium">{title}</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{body}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section className="mt-12 rounded-lg border bg-card p-6" aria-labelledby="not-heading">
      <h2 id="not-heading" className="mb-3 text-xl font-semibold">
        What it doesn't do
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
        {doesNot.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Renting in Ontario? Our{' '}
        <Link href="/resources" className="text-primary underline underline-offset-4">
          guide
        </Link>{' '}
        covers deposits, viewings and budgeting.
      </p>
    </section>

    <section className="mt-12" aria-labelledby="next-heading">
      <h2 id="next-heading" className="mb-5 text-2xl font-semibold">
        What's next
      </h2>
      <ol className="space-y-4">
        {next.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="font-serif text-xl text-primary tabular-nums" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-[15px] text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <div className="mt-14">
      <FAQ />
    </div>
  </article>
);

export default About;
