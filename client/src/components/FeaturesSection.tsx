const steps = [
  {
    title: 'Say what you need',
    body: 'Type it the way you would say it, like "2 bedroom under $900 within 2 km of campus". The filters fill themselves in, and you can adjust any of them.',
  },
  {
    title: 'Compare on the list or the map',
    body: 'Every place shows its distance from campus. Switch to the map to see where they are, then pan around and search just that area.',
  },
  {
    title: 'Message the landlord',
    body: 'Ask about a place without leaving the site. Replies arrive live in your inbox, and you get an email if you are away.',
  },
];

/** How it works, in the three steps a student actually takes. */
const FeaturesSection = () => (
  <section className="border-y bg-muted/40" aria-labelledby="how-heading">
    <div className="page py-14 md:py-16">
      <p className="eyebrow mb-2">How it works</p>
      <h2 id="how-heading" className="mb-10 max-w-xl text-2xl font-semibold md:text-3xl">
        From "I need a place" to talking with a landlord
      </h2>
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, i) => (
          <li key={step.title} className="border-t border-foreground/15 pt-5">
            <span className="font-serif text-3xl text-primary" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 font-sans text-base font-semibold">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default FeaturesSection;
