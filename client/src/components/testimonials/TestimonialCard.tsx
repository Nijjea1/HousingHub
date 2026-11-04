import { useState } from 'react';
import { Testimonial } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';

interface TestimonialCardProps {
  testimonial: Testimonial;
  delay: number;
}

const TestimonialCard = ({ testimonial, delay }: TestimonialCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Render full or half stars based on rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <motion.i 
          key={`full-${i}`} 
          className="fas fa-star"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * i + delay, duration: 0.3 }}
        />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <motion.i 
          key="half" 
          className="fas fa-star-half-alt"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * fullStars + delay, duration: 0.3 }}
        />
      );
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <motion.i 
          key={`empty-${i}`} 
          className="far fa-star text-white/30"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * (fullStars + (hasHalfStar ? 1 : 0) + i) + delay, duration: 0.3 }}
        />
      );
    }
    
    return stars;
  };
  
  // Card animations
  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 30,
      rotateY: -5,
    },
    animate: { 
      opacity: 1, 
      y: 0,
      rotateY: 0,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: delay
      }
    },
    hover: {
      y: -10,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };
  
  // Quote animations
  const quoteVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { delay: delay + 0.3, duration: 0.4 }
    }
  };
  
  // Author animations
  const authorVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { delay: delay + 0.5, duration: 0.4 }
    }
  };

  return (
    <motion.div 
      className="relative group h-full"
      variants={cardVariants}
      initial="initial"
      whileInView="animate"
      whileHover="hover"
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glass card with gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-indigo-500/50 opacity-0 group-hover:opacity-100 blur-[1px] transition-opacity duration-300"></div>
      
      <div className="relative h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-lg overflow-hidden flex flex-col">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        
        {/* Subtle glow on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
        
        {/* Quote mark */}
        <div className="absolute top-4 right-4 text-4xl text-white/10 opacity-50">
          <i className="fas fa-quote-right"></i>
        </div>
        
        {/* Content */}
        <div className="flex items-center mb-6 z-10">
          <div className="text-amber-400 flex space-x-1 text-lg">
            {renderStars(testimonial.rating)}
          </div>
        </div>
        
        <motion.blockquote 
          className="mb-8 relative flex-grow"
          variants={quoteVariants}
        >
          <p className="text-white/90 relative z-10 text-lg font-light leading-relaxed">
            "{testimonial.text}"
          </p>
        </motion.blockquote>
        
        <motion.div 
          className="flex items-center mt-auto pt-4 border-t border-white/10"
          variants={authorVariants}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden mr-4 ring-2 ring-white/20 ring-offset-2 ring-offset-indigo-900">
            <motion.img 
              src={testimonial.author.imageUrl} 
              alt={`${testimonial.author.name} testimonial`}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div>
            <p className="font-medium text-white">{testimonial.author.name}</p>
            <div className="flex items-center text-white/70 text-sm">
              <i className="fas fa-university mr-1.5 text-blue-300"></i>
              <span>{testimonial.author.school}, {testimonial.author.year}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TestimonialCard;
