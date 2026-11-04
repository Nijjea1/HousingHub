import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: 'fa-home',
    title: 'Student-Friendly Housing',
    description: 'Find housing options specifically designed for students, close to campus and with all the amenities you need.'
  },
  {
    icon: 'fa-search',
    title: 'Smart Search',
    description: 'Our advanced search filters help you find the perfect place based on your preferences and requirements.'
  },
  {
    icon: 'fa-star',
    title: 'Verified Listings',
    description: 'All listings are verified to ensure you get accurate information and a safe housing experience.'
  },
  {
    icon: 'fa-comments',
    title: 'Direct Communication',
    description: 'Connect directly with property owners and managers to get your questions answered quickly.'
  },
  {
    icon: 'fa-map-marker-alt',
    title: 'Location Insights',
    description: 'Get detailed information about the neighborhood, nearby amenities, and distance from campus.'
  },
  {
    icon: 'fa-heart',
    title: 'Save Favorites',
    description: 'Save your favorite listings and create collections to organize your housing search.'
  }
];

const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Staggered container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  // Header animations
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

  useEffect(() => {
    // Trigger animations after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -left-40 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -right-40 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl"></div>
        
        <motion.div 
          className="text-center mb-16 relative"
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
        >
          <div className="inline-block mb-6">
            <motion.div 
              className="relative inline-block"
              variants={headerVariants}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-lg opacity-20"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-lg px-6 py-3 border border-blue-100">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-medium">
                  Student-centric features
                </span>
              </div>
            </motion.div>
          </div>
          
          <motion.h2 
            className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-800 to-blue-600 bg-clip-text text-transparent mb-6"
            variants={headerVariants}
          >
            Why Students Choose LetMeKnock
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-3xl mx-auto"
            variants={headerVariants}
          >
            We've built a platform specifically designed for the unique needs of university students, making housing search simple, transparent, and stress-free.
          </motion.p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <i className={`fas ${feature.icon} text-primary-600 text-xl`}></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <Link href="/resources">
            <div className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50 rounded-full transition-colors cursor-pointer">
              <span className="mr-2">Learn more about our features</span>
              <i className="fas fa-arrow-right text-sm"></i>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
