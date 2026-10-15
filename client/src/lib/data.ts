// Static content shared by the About and Guidelines pages.

export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: 'How do I search for housing on LetMeKnock?',
    answer:
      'Type what you need into "Describe your place" (for example "2 bedroom under $900 near campus"), or use the filters on the listings page. You can limit results to 1, 2, 5 or 10 km from your campus and switch between the list and the map.',
  },
  {
    question: 'Are utilities included in the rental prices?',
    answer:
      'It depends on the listing. Landlords list which utilities are included on each listing page. If it is not listed, ask the landlord.',
  },
  {
    question: 'How can I contact a landlord?',
    answer:
      'Open the listing and press "Message landlord". Replies show up live in your inbox, and you get an email if a message arrives while you are away.',
  },
  {
    question: 'Can I find roommates through LetMeKnock?',
    answer:
      'Not yet. Roommate matching is on our roadmap. For now you can note in your profile preferences that you are open to roommates.',
  },
  {
    question: 'What areas do you serve?',
    answer: 'We are launching at McMaster University in Hamilton, Ontario, and plan to add more Canadian campuses.',
  },
  {
    question: 'How are listings checked?',
    answer:
      'Landlords post listings themselves and we do not inspect properties. Always view a place in person, and never send money before you have seen the place and signed a lease.',
  },
];
