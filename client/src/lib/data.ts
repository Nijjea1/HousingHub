// Types
export interface Landlord {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  responseRate: number;
  responseTime: string;
  profileImage: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  detailedDescription?: string;
  price: number;
  type: 'Apartment' | 'House' | 'Dormitory' | 'Studio';
  bedrooms: number;
  bathrooms: number | 'Shared';
  squareFeet: number;
  amenities: string[];
  imageUrl: string;
  additionalImages?: string[];
  favorite?: boolean;
  location: string;
  address?: string;
  availableFrom?: string;
  leaseTerm?: string;
  petsAllowed?: boolean;
  furnished?: boolean;
  nearbyPlaces?: string[];
  distanceFromCampus?: string;
  utilitiesIncluded?: string[];
  user_id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Testimonial {
  id: string;
  text: string;
  author: {
    name: string;
    school: string;
    year: string;
    imageUrl: string;
  };
  rating: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// Static data for features section
export const features: Feature[] = [
  {
    id: '1',
    title: 'Easy Search',
    description: 'Find the perfect student housing with our powerful search and filter options to match your needs.',
    icon: 'fa-search'
  },
  {
    id: '2',
    title: 'Map View',
    description: 'Visualize housing options on an interactive map to find places close to campus or transportation.',
    icon: 'fa-map-marked-alt'
  },
  {
    id: '3',
    title: 'Verified Listings',
    description: 'All our listings are verified to ensure you\'re viewing accurate and up-to-date information.',
    icon: 'fa-shield-alt'
  },
  {
    id: '4',
    title: 'Campus Proximity',
    description: 'Find housing options specifically tailored for students, with proximity to your university.',
    icon: 'fa-university'
  },
  {
    id: '5',
    title: 'Mobile Friendly',
    description: 'Browse listings on the go with our fully responsive design optimized for all devices.',
    icon: 'fa-mobile-alt'
  },
  {
    id: '6',
    title: 'Student Community',
    description: 'Connect with other students looking for roommates or get advice from those who\'ve been there.',
    icon: 'fa-users'
  }
];

// Static data for testimonials section
export const testimonials: Testimonial[] = [
  {
    id: '1',
    text: 'LetMeKnock made finding a place near campus so easy! I was able to filter exactly what I needed and found the perfect apartment within a day.',
    author: {
      name: 'Sarah Johnson',
      school: 'State University',
      year: 'Junior',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
    },
    rating: 5
  },
  {
    id: '2',
    text: 'As someone new to the city, I had no idea where to start looking for housing. LetMeKnock\'s map feature was a lifesaver for finding places close to campus!',
    author: {
      name: 'Michael Rodriguez',
      school: 'City College',
      year: 'Freshman',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
    },
    rating: 5
  },
  {
    id: '3',
    text: 'My roommates and I needed a 4-bedroom house close to campus, and LetMeKnock had so many options. The filtering tools saved us so much time!',
    author: {
      name: 'Jennifer Lee',
      school: 'Tech University',
      year: 'Senior',
      imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
    },
    rating: 4.5
  }
];

// Static data for landlords
export const landlords: Landlord[] = [
  {
    id: 'landlord1',
    name: 'Jennifer Williams',
    phoneNumber: '(555) 123-4567',
    email: 'jwilliams@example.com',
    responseRate: 98,
    responseTime: 'within 24 hours',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'landlord2',
    name: 'Robert Chen',
    phoneNumber: '(555) 234-5678',
    email: 'rchen@example.com',
    responseRate: 92,
    responseTime: 'within 12 hours',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'landlord3',
    name: 'Campus Housing Inc.',
    phoneNumber: '(555) 345-6789',
    email: 'rentals@campushousing.example.com',
    responseRate: 95,
    responseTime: 'within 48 hours',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'landlord4',
    name: 'University Residences',
    phoneNumber: '(555) 456-7890',
    email: 'housing@university.example.edu',
    responseRate: 99,
    responseTime: 'within 6 hours',
    profileImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80'
  }
];

// Static data for listings
export const listings: Listing[] = [
  {
    id: '1',
    title: 'Modern Campus View Apartment',
    description: '2 blocks from State University, utilities included',
    detailedDescription: 'This beautifully renovated apartment is perfect for students who want to be close to campus without sacrificing comfort. The unit features modern appliances, plenty of natural light, and a spacious layout. The building has secure entry, on-site laundry, and a small community area for studying or socializing.',
    price: 850,
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 750,
    amenities: ['WiFi', 'Laundry', 'Furnished', 'Security System', 'Study Area'],
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    ],
    location: 'Near State University',
    address: '123 University Ave, College Town, ST 12345',
    availableFrom: '2023-08-01',
    leaseTerm: '12 months',
    petsAllowed: false,
    furnished: true,
    nearbyPlaces: ['State University Library', 'College Café', 'Campus Bookstore', 'University Health Center'],
    distanceFromCampus: '0.2 miles',
    utilitiesIncluded: ['Water', 'Internet', 'Trash', 'Electricity'],
    user_id: 'landlord1',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '2',
    title: 'Collegiate Corner House',
    description: '5 min walk to campus, recently renovated',
    detailedDescription: 'This charming house is ideal for a group of students looking to share accommodations. The home has been recently renovated with new flooring, updated kitchen appliances, and fresh paint throughout. Each bedroom is spacious enough for a bed, desk, and storage. The backyard is perfect for outdoor gatherings and relaxing after classes.',
    price: 1200,
    type: 'House',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    amenities: ['Parking', 'Backyard', 'Pets Allowed', 'Washer/Dryer', 'High-Speed Internet'],
    imageUrl: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    ],
    location: 'College District',
    address: '456 College St, College Town, ST 12345',
    availableFrom: '2023-07-15',
    leaseTerm: '12 months',
    petsAllowed: true,
    furnished: false,
    nearbyPlaces: ['Campus Main Gate', 'Student Union', 'University Recreation Center', 'College Town Grocery'],
    distanceFromCampus: '0.3 miles',
    utilitiesIncluded: ['Water', 'Trash'],
    user_id: 'landlord2',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '3',
    title: 'Bright Downtown Studio',
    description: '10 min bus ride to campus, all utilities included',
    price: 750,
    type: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 450,
    amenities: ['WiFi', 'Furnished', 'Gym'],
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'Downtown',
    user_id: 'landlord3',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '4',
    title: 'University Heights Dorm',
    description: 'On campus, meal plan available, shared bathrooms',
    price: 650,
    type: 'Dormitory',
    bedrooms: 1,
    bathrooms: 'Shared',
    squareFeet: 300,
    amenities: ['WiFi', 'Meal Plan', 'Laundry'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'On Campus',
    user_id: 'landlord4',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '5',
    title: 'Parkside Student Apartments',
    description: 'Across from City Park, 15 min walk to campus',
    price: 950,
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 850,
    amenities: ['WiFi', 'Pool', 'Gym'],
    imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'City Park Area',
    user_id: 'landlord1',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '6',
    title: 'Student Group House',
    description: 'Perfect for groups, close to campus and downtown',
    price: 1800,
    type: 'House',
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 1800,
    amenities: ['Parking', 'Laundry', 'Backyard'],
    imageUrl: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'College District',
    user_id: 'landlord2',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '7',
    title: 'Luxury Campus Apartment',
    description: 'Modern amenities, walking distance to university',
    price: 1100,
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 900,
    amenities: ['WiFi', 'Gym', 'Security'],
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'University District',
    user_id: 'landlord3',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  },
  {
    id: '8',
    title: 'Cozy Campus Studio',
    description: 'All utilities included, perfect for singles',
    price: 700,
    type: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 400,
    amenities: ['WiFi', 'Furnished', 'Utilities Included'],
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    location: 'Campus Edge',
    user_id: 'landlord4',
    createdAt: '2023-07-01T10:00:00',
    updatedAt: '2023-07-01T10:00:00'
  }
];

// FAQ data
export const faqItems: FAQItem[] = [
  {
    question: 'How do I search for housing on LetMeKnock?',
    answer: 'You can search for housing by using the search filters at the top of our homepage or listings page. Filter by location, price range, number of bedrooms, and more to find the perfect place for you.'
  },
  {
    question: 'Are utilities included in the rental prices?',
    answer: 'This varies by listing. Some rentals include utilities in the price, while others do not. Check the individual listing details, where utility information is clearly displayed.'
  },
  {
    question: 'How can I contact a property owner or manager?',
    answer: 'Currently, our platform is in demo mode without direct messaging. In future versions, you\'ll be able to contact owners directly through our messaging system.'
  },
  {
    question: 'Can I find roommates through LetMeKnock?',
    answer: 'Our roommate matching feature is coming soon! In the future version, you\'ll be able to create a profile and match with potential roommates based on preferences and lifestyle.'
  },
  {
    question: 'What areas do you serve?',
    answer: 'We currently focus on providing listings near major universities and colleges across the country. We\'re constantly expanding to new areas!'
  },
  {
    question: 'How often are new listings added?',
    answer: 'New listings are added daily. Property managers and landlords regularly update their available properties, so check back frequently if you don\'t find what you\'re looking for initially.'
  }
];
