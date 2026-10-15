import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-serif text-6xl text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold">Nobody's home at this address</h1>
      <p className="mt-3 text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild>
          <Link href="/listings">Browse listings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
