import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useUnreadCount } from '../hooks/use-messages';
import logo from '../assets/logo.svg';
import userIcon from '../assets/user-icon.svg';

interface NavBarProps {
  scrollY: number;
}

const NavBar: React.FC<NavBarProps> = ({ scrollY }) => {
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadCount(user?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Calculate blur intensity based on scroll
  const getBlurIntensity = () => {
    const minBlur = 5;
    const maxBlur = 10;
    const scrollRange = 100;
    
    const blur = minBlur + Math.min(1, scrollY / scrollRange) * (maxBlur - minBlur);
    return `blur(${blur}px)`;
  };
  
  // Animation variants for elements
  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.1
      }
    }
  };
  
  const navItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (custom: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: 0.15 + custom * 0.05
      }
    })
  };
  
  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (custom: number) => ({ 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.3 + custom * 0.07
      }
    })
  };
  
  // Update scroll state for enhanced styling
  useEffect(() => {
    setIsScrolled(scrollY > 100);
  }, [scrollY]);
  
  // Set loaded state after mount for animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const isActive = (path: string) => location === path;
  
  // Helper function to get nav item style based on active state
  const getNavItemStyle = (path: string) => {
    const baseStyle = "font-medium whitespace-nowrap transition-all duration-300 px-3 py-2 rounded-full cursor-pointer";
    const activeStyle = "bg-white/20 text-white backdrop-blur-sm shadow-inner";
    const inactiveStyle = "text-white hover:bg-white/20 hover:text-white";
    
    return `${baseStyle} ${isActive(path) ? activeStyle : inactiveStyle}`;
  };
  
  // Navigation items data. Signed-in people also get their inbox and a way to post.
  const navigationItems = [
    { path: "/", label: "Home", icon: "fa-home" },
    { path: "/listings", label: "Listings", icon: "fa-building" },
    { path: "/map", label: "Map", icon: "fa-map-marker-alt" },
    { path: "/resources", label: "Resources", icon: "fa-book" },
    { path: "/about", label: "About", icon: "fa-info-circle" },
    ...(user
      ? [
          { path: "/inbox", label: "Messages", icon: "fa-envelope" },
          { path: "/create-listing", label: "Post", icon: "fa-plus" },
        ]
      : []),
  ];

  const itemLabel = (item: { label: string; icon: string }, showIcon = true) => (
    <>
      {showIcon && <i className={`fas ${item.icon} mr-2`}></i>}
      {item.label}
      {item.label === "Messages" && unread > 0 && (
        <span
          className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold leading-5 text-white"
          aria-label={`${unread} unread`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center">
      <motion.nav 
        className="transition-all duration-500 overflow-hidden mx-8 lg:mx-16 my-4 rounded-full max-w-5xl mx-auto w-[calc(100%+1px)]"
        style={{
          backdropFilter: getBlurIntensity()
        }}
      >
        {/* Dynamic navbar background */}
        <div 
          className="absolute inset-0 transition-all duration-500 rounded-full border border-white/10"
          style={{
            background: `linear-gradient(to right, rgba(26, 32, 77, 0.65), rgba(59, 66, 113, 0.65))`,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
          }}
        />
        
        {/* Animated glow effect */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isScrolled ? 'opacity-0' : 'opacity-100'} pointer-events-none`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-2 lg:px-4">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <motion.div 
              className="flex items-center"
              variants={logoVariants}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
            >
              <Link href="/">
                <div className="flex items-center gap-2.5 group">
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <img src={logo} alt="HouseHunterHub Logo" className="w-6 h-6 opacity-85" />
                    </div>
                  </div>
                  <motion.span 
                    className="text-white font-bold text-xl tracking-tight"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    LetMeKnock
                  </motion.span>
                </div>
              </Link>
            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  custom={index}
                  variants={navItemVariants}
                  initial="hidden"
                  animate={isLoaded ? "visible" : "hidden"}
                >
                  <Link href={item.path}>
                    <div className={`${getNavItemStyle(item.path)} ${item.label === 'Listings' ? 'bg-white/20 hover:bg-white/30' : ''}`}>
                      {itemLabel(item, !user)}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <motion.div
                variants={buttonVariants}
                custom={0}
                initial="hidden"
                animate={isLoaded ? "visible" : "hidden"}
                className="flex space-x-2"
              >
                {user ? (
                  <Link href="/profile">
                    <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-2 rounded-full text-white transition-all duration-300 cursor-pointer">
                      <img src={userIcon} alt="User Profile" className="w-6 h-6" />
                      <span className="max-w-[6rem] truncate text-sm font-medium">{user.email?.split('@')[0]}</span>
                    </div>
                  </Link>
                ) : (
                  <Link href="/signin">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                      <div className="relative font-medium text-white bg-white/20 backdrop-blur-sm hover:bg-white/30 px-5 py-2 rounded-full transition-colors shadow-lg cursor-pointer flex items-center">
                        <i className="fas fa-sign-in-alt mr-2"></i> Sign In
                      </div>
                    </div>
                  </Link>
                )}
              </motion.div>
              
              {/* Mobile menu button */}
              <motion.button
                variants={buttonVariants}
                custom={1}
                initial="hidden"
                animate={isLoaded ? "visible" : "hidden"}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg cursor-pointer text-white">
                  <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                </div>
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigationItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={item.path}>
                      <div className={`${getNavItemStyle(item.path)} ${item.label === 'Listings' ? 'bg-white/20 hover:bg-white/30' : ''}`}>
                        {itemLabel(item)}
                      </div>
                    </Link>
                  </motion.div>
                ))}
                {!user && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navigationItems.length * 0.1 }}
                  >
                    <Link href="/signin">
                      <div className="block px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white rounded-full">
                        <i className="fas fa-sign-in-alt mr-2"></i> Sign In
                      </div>
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
};

export default NavBar;
