import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { FavoritesProvider } from './hooks/use-favorites';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages
import Home from './pages/Home';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import GuidelinesAndFAQ from './pages/GuidelinesAndFAQ';
import About from './pages/About';
import Map from './pages/Map';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import MyListings from './pages/MyListings';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import NotFound from './pages/not-found';

// Import components
import NavBar from './components/NavBar';
import Footer from './components/Footer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const Router: React.FC = () => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/listings" component={Listings} />
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/resources" component={GuidelinesAndFAQ} />
      <Route path="/about" component={About} />
      <Route path="/map" component={Map} />
      <Route path="/signin">{() => <Auth initialMode="signin" />}</Route>
      <Route path="/signup">{() => <Auth initialMode="signup" />}</Route>
      <Route path="/profile" component={Profile} />
      <Route path="/profile/my-listings" component={MyListings} />
      <Route path="/create-listing" component={CreateListing} />
      <Route path="/edit-listing/:id" component={EditListing} />
      <Route component={NotFound} />
    </Switch>
  );
};

const AppContent: React.FC = () => {
  const [scrollY, setScrollY] = React.useState(0);
  const { user } = useAuth();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <FavoritesProvider userId={user?.id ?? ''}>
      <div className="min-h-screen flex flex-col">
        <NavBar scrollY={scrollY} />
        <main className="flex-grow">
          <Router />
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </FavoritesProvider>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
