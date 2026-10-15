import { Link } from 'wouter';
import { Wordmark } from './Logo';

const columns: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: 'Explore',
    links: [
      ['/listings', 'Browse listings'],
      ['/map', 'Map'],
      ['/resources', 'Guides and FAQ'],
      ['/about', 'About'],
    ],
  },
  {
    title: 'Your account',
    links: [
      ['/signin', 'Sign in'],
      ['/signup', 'Create an account'],
      ['/inbox', 'Messages'],
      ['/create-listing', 'Post a listing'],
    ],
  },
];

const Footer = () => (
  <footer className="mt-auto border-t bg-muted/40">
    <div className="page py-12">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
        <div className="col-span-2">
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Student housing near McMaster, with more Canadian campuses to come.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="eyebrow mb-3 font-sans">{column.title}</h2>
            <ul className="space-y-2 text-sm">
              {column.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mt-10 flex flex-col justify-between gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row">
        <p>&copy; LetMeKnock</p>
        <p>
          Map data &copy;{' '}
          <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-foreground">
            OpenStreetMap
          </a>{' '}
          contributors
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
