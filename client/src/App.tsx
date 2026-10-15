import React, { Suspense, lazy } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { FavoritesProvider } from './hooks/use-favorites';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useMessageEvents, usePresenceHeartbeat } from './hooks/use-messages';
import { useTheme } from './hooks/use-theme';
import NavBar from './components/NavBar';
import Footer from './components/Footer';

// Home and the browse page load with the app; the rest load when first visited.
import Home from './pages/Home';
import Listings from './pages/Listings';
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const GuidelinesAndFAQ = lazy(() => import('./pages/GuidelinesAndFAQ'));
const About = lazy(() => import('./pages/About'));
const MapPage = lazy(() => import('./pages/Map'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const MyListings = lazy(() => import('./pages/MyListings'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const EditListing = lazy(() => import('./pages/EditListing'));
const Inbox = lazy(() => import('./pages/Inbox'));
const NotFound = lazy(() => import('./pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const PageLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
  </div>
);

const Router: React.FC = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/listings" component={Listings} />
        <Route path="/listings/:id" component={ListingDetail} />
        <Route path="/resources" component={GuidelinesAndFAQ} />
        <Route path="/about" component={About} />
        <Route path="/map" component={MapPage} />
        <Route path="/signin">{() => <Auth initialMode="signin" />}</Route>
        <Route path="/signup">{() => <Auth initialMode="signup" />}</Route>
        <Route path="/profile" component={Profile} />
        <Route path="/profile/my-listings" component={MyListings} />
        <Route path="/create-listing" component={CreateListing} />
        <Route path="/edit-listing/:id" component={EditListing} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/inbox/:id" component={Inbox} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  useMessageEvents(user?.id);
  usePresenceHeartbeat(user?.id);

  return (
    <FavoritesProvider userId={user?.id ?? ''}>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-grow">
          <Router />
        </main>
        <Footer />
      </div>
      <Toaster position="bottom-right" theme={theme} />
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
