import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 1.1]);
  const textY = useTransform(scrollY, [0, 300], [0, 100]);

  useEffect(() => {
    // Set loaded to true after a short delay to trigger animations
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Parallax image variant
  const heroImage = {
    hidden: { scale: 1.1, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 1.2,
        ease: [0.25, 0.1, 0.25, 1.0], // Cubic bezier curve for smooth easing
      }
    }
  };

  // Text container variants
  const textContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  // Heading variants
  const heading = {
    hidden: { y: -40, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
  };

  // Description variants
  const description = {
    hidden: { y: 40, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
  };

  // Button container variants
  const buttonContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  // Button variants
  const buttonItem = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    }
  };

  // Card that floats in animation
  const floatingCard = {
    hidden: { y: 80, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        delay: 0.9,
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      {/* Background image with parallax effect */}
      <motion.div 
        className="absolute inset-0 z-0" 
        style={{ scale, opacity }}
        variants={heroImage}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        <img 
          src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80" 
          alt="Student apartment building"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40"></div>

        {/* Animated floating shapes */}
        <motion.div 
          className="absolute top-[20%] right-[15%] w-32 h-32 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
          animate={{ 
            y: [0, -30, 0], 
            rotate: [0, 5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />

        <motion.div 
          className="absolute top-[60%] left-[10%] w-24 h-24 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
          animate={{ 
            y: [0, 20, 0], 
            x: [0, -10, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1 
          }}
        />
      </motion.div>
      
      {/* Content area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div 
            className="text-left lg:text-left"
            variants={textContainer}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            style={{ y: textY }}
          >
            <motion.span 
              className="inline-block bg-white/10 text-white backdrop-blur-sm py-1 px-3 rounded-full text-sm font-medium mb-4"
              variants={heading}
            >
              Student Housing Made Simple
            </motion.span>
            
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight"
              variants={heading}
            >
              Find Your Perfect <span className="text-white">Student Home</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-white/90 mb-10 max-w-2xl"
              variants={description}
            >
              LetMeKnock connects students with the best housing options near campus. Browse listings, view on map, and find your new home with ease.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-6"
              variants={buttonContainer}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
            >
              <motion.div variants={buttonItem}>
                <Link href="/listings">
                  <div className="px-8 py-4 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-colors shadow-lg cursor-pointer">
                    Browse Listings
                  </div>
                </Link>
              </motion.div>
              <motion.div variants={buttonItem}>
                <Link href="/about">
                  <div className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full font-medium hover:bg-white/20 transition-colors shadow-lg cursor-pointer">
                    Learn More
                  </div>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Floating card */}
          <motion.div 
            className="hidden lg:block"
            variants={floatingCard}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-home text-white text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Student Housing</h3>
                    <p className="text-white/70 text-sm">Verified Listings</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-white/80">
                    <i className="fas fa-check-circle text-white/90 mr-2"></i>
                    <span>Verified Property Listings</span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <i className="fas fa-check-circle text-white/90 mr-2"></i>
                    <span>Direct Communication</span>
                  </div>
                  <div className="flex items-center text-white/80">
                    <i className="fas fa-check-circle text-white/90 mr-2"></i>
                    <span>Secure Booking Process</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
