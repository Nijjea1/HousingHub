import { useState } from 'react';
import { Feature } from '@/lib/data';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

interface FeatureCardProps {
  feature: Feature;
  delay: number;
}

const FeatureCard = ({ feature, delay }: FeatureCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Mouse tracking for gradient highlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Create gradients that follow mouse position
  const backgroundGradient = useMotionTemplate`radial-gradient(
    650px circle at ${mouseX}px ${mouseY}px,
    rgba(59, 130, 246, 0.07) 0%,
    rgba(59, 130, 246, 0.0) 50%,
    rgba(59, 130, 246, 0.0) 100%
  )`;
  
  // Handle mouse movement for gradient effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };
  
  // Get icon color based on feature type
  const getIconColor = () => {
    const iconMap: Record<string, string> = {
      'fa-search': 'from-blue-400 to-blue-600',
      'fa-map-marked-alt': 'from-purple-400 to-purple-600',
      'fa-shield-alt': 'from-green-400 to-green-600',
      'fa-university': 'from-yellow-400 to-yellow-600',
      'fa-mobile-alt': 'from-pink-400 to-pink-600',
      'fa-comments': 'from-indigo-400 to-indigo-600'
    };
    
    return iconMap[feature.icon] || 'from-blue-400 to-blue-600';
  };
  
  return (
    <motion.div 
      className="relative rounded-2xl p-px overflow-hidden group"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.7, 
        delay: delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated border */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
        style={{
          background: 'linear-gradient(80deg, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.7), rgba(59, 130, 246, 0))',
          filter: 'blur(1px)',
          WebkitFilter: 'blur(1px)'
        }}
      />
      
      {/* Card content */}
      <div 
        className="relative bg-white backdrop-blur-sm rounded-2xl p-8 h-full flex flex-col shadow-sm border border-gray-100 overflow-hidden"
        style={{ backgroundImage: backgroundGradient as any }}
        onMouseMove={handleMouseMove}
      >
        {/* Icon with glass effect */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-sm opacity-20"></div>
          <div className="relative">
            <motion.div
              className={`w-16 h-16 bg-gradient-to-br ${getIconColor()} rounded-2xl flex items-center justify-center text-white shadow-md overflow-hidden relative`}
              whileHover={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.1, 1.1, 1],
              }}
              transition={{ 
                duration: 0.6,
                repeat: 0
              }}
            >
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/30 rounded-full blur-md"></div>
                <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-white/20 rounded-full blur-md"></div>
              </div>
              <motion.div
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 0, 0, 0, 0, 5, 0, -5, 0],
                }}
                transition={{ 
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <i className={`fas ${feature.icon} text-2xl`}></i>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Content */}
        <motion.h3 
          className="text-xl font-semibold text-gray-900 mb-3"
          animate={{ scale: isHovered ? 1.03 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {feature.title}
        </motion.h3>
        
        <p className="text-gray-600 text-sm">
          {feature.description}
        </p>
        
        {/* Learn more link */}
        <div className="mt-auto pt-4">
          <div className="inline-flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Learn more</span>
            <motion.span 
              className="ml-1"
              animate={isHovered ? { x: [0, 4, 4] } : { x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </motion.span>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-gradient-to-r from-blue-200 to-purple-100 opacity-30 blur-xl"/>
        <div className="absolute right-1/2 -bottom-2 w-12 h-12 rounded-full bg-gradient-to-r from-blue-300 to-blue-100 opacity-20 blur-xl"/>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
