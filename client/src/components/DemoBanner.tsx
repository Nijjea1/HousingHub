import { resetDemo } from '@/demo/store';

/** Says plainly that this build runs on sample data in the browser, and lets the visitor start over. */
const DemoBanner = () => {
  const reset = () => {
    resetDemo();
    // A full reload drops every cached query, so the page shows the seeded data again.
    window.location.href = '/';
  };

  return (
    <div
      role="note"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-full bg-slate-900/90 px-4 py-2 text-xs text-white shadow-lg backdrop-blur sm:right-auto lg:bottom-4"
    >
      <span>Demo mode: sample listings, and anything you do is saved in this browser only.</span>
      <button type="button" onClick={reset} className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
        Reset demo
      </button>
    </div>
  );
};

export default DemoBanner;
