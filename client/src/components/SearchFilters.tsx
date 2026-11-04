import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';

const SearchFilters = () => {
  const [, navigate] = useLocation();
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (price) params.append('price', price);
    if (bedrooms) params.append('bedrooms', bedrooms);
    if (propertyType) params.append('type', propertyType);
    
    // Navigate to listings page with filters
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
      <motion.div 
        className="bg-white rounded-2xl shadow-2xl p-8 border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-primary-800">Find Your Perfect Student Housing</h2>
          <p className="text-gray-600 mt-1">Filter through verified listings near your campus</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-map-marker-alt text-primary-600"></i>
                </div>
                <input 
                  type="text" 
                  id="location" 
                  name="location" 
                  placeholder="University or area"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 block w-full rounded-full border-gray-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-30 py-3 border focus:outline-none"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-dollar-sign text-primary-600"></i>
                </div>
                <select 
                  id="price" 
                  name="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-10 block w-full rounded-full border-gray-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-30 py-3 border focus:outline-none"
                >
                  <option value="">Any price</option>
                  <option value="0-500">$0 - $500</option>
                  <option value="500-1000">$500 - $1,000</option>
                  <option value="1000-1500">$1,000 - $1,500</option>
                  <option value="1500-2000">$1,500 - $2,000</option>
                  <option value="2000+">$2,000+</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-bed text-primary-600"></i>
                </div>
                <select 
                  id="bedrooms" 
                  name="bedrooms"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="pl-10 block w-full rounded-full border-gray-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-30 py-3 border focus:outline-none"
                >
                  <option value="">Any bedrooms</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4+">4+ Bedrooms</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-home text-primary-600"></i>
                </div>
                <select 
                  id="propertyType" 
                  name="propertyType"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="pl-10 block w-full rounded-full border-gray-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-30 py-3 border focus:outline-none"
                >
                  <option value="">Any type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Dormitory">Dormitory</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <motion.button 
              type="submit" 
              className="px-8 py-3.5 bg-primary-800 text-white rounded-full font-medium hover:bg-primary-700 transition-colors shadow-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <i className="fas fa-search mr-2"></i> Find Student Housing
            </motion.button>
          </div>
        </form>
      </motion.div>
    </section>
  );
};

export default SearchFilters;
