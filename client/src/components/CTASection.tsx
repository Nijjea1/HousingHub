import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

/** The landlord side, kept short: most visitors are students. */
const CTASection = () => (
  <section className="page py-14 md:py-16" aria-labelledby="landlords-heading">
    <div className="flex flex-col gap-6 rounded-lg border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="max-w-xl">
        <p className="eyebrow mb-2">For landlords</p>
        <h2 id="landlords-heading" className="text-2xl font-semibold">
          Renting a place near campus?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Post it with photos and the address, and we place it on the map with its distance from campus. Students message
          you here, so your phone number stays private.
        </p>
      </div>
      <div className="flex shrink-0 gap-3">
        <Button asChild>
          <Link href="/create-listing">Post a listing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/resources">Read the guidelines</Link>
        </Button>
      </div>
    </div>
  </section>
);

export default CTASection;
