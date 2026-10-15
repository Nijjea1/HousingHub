import { Link, useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import DescribeSearch from '@/components/listings/DescribeSearch';
import { useCampus } from '@/hooks/use-campus';
import { searchToQuery } from '@shared/search';

const EXAMPLES = ['Under $800 near campus', '2 bedroom within 2 km', 'Furnished studio with laundry'];

/** The home page opens on the search itself: say what you need, land on matching listings. */
const HeroSection = () => {
  const [, navigate] = useLocation();
  const { campus } = useCampus();

  return (
    <section className="border-b">
      <div className="page grid gap-10 py-14 md:py-20 lg:grid-cols-[1fr_18rem] lg:gap-16">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Hamilton, Ontario · McMaster University</p>
          <h1 className="text-4xl font-semibold leading-[1.1] md:text-5xl lg:text-[3.5rem]">
            Student rentals near McMaster, in one place.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Search by distance from campus, filter by what matters to you, and message landlords directly. No scrolling
            through group posts.
          </p>
          <div className="mt-8">
            <DescribeSearch
              campus={campus}
              size="large"
              examples={EXAMPLES}
              onSearch={(params) => {
                const query = searchToQuery(params).toString();
                navigate(query ? `/listings?${query}` : '/listings');
              }}
            />
          </div>
        </div>

        <aside className="self-end border-l pl-6 lg:pl-8">
          <p className="eyebrow mb-3">Or start from</p>
          <ul className="space-y-1">
            {[
              ['/listings', 'Every listing'],
              ['/map', 'The map around campus'],
              ['/resources', 'Renting guides for students'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="group flex items-center justify-between gap-3 py-2 text-[15px] hover:text-primary">
                  {label}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
};

export default HeroSection;
