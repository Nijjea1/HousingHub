import { motion } from 'framer-motion';

const Map = () => {
  return (
    <div className="pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl font-bold text-primary-800 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Find Housing on Map
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Visualize housing options near your campus
          </motion.p>
        </div>

        <motion.div 
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="p-4 bg-primary-800 text-white flex justify-between items-center">
            <h2 className="text-lg font-medium">Interactive Housing Map</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-white text-primary-800 rounded text-sm font-medium">Satellite</button>
              <button className="px-3 py-1 bg-white/20 text-white rounded text-sm font-medium">Map</button>
            </div>
          </div>
          
          <div className="bg-gray-100 h-[70vh] relative flex items-center justify-center">
            <div className="text-center px-4 py-8">
              <i className="fas fa-map-marked-alt text-primary-800 text-5xl mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Map Feature Coming Soon</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Our interactive map feature is currently under development. Soon you'll be able to visualize all available 
                housing options relative to campus locations, public transit, and other important landmarks.
              </p>
              <button className="px-4 py-2 bg-primary-800 text-white rounded-md font-medium hover:bg-primary-700 transition-colors">
                Get Notified When Available
              </button>
            </div>
            
            {/* Map loading indicator */}
            <div className="absolute bottom-4 left-4 bg-white p-2 rounded-md shadow text-sm text-gray-500">
              <i className="fas fa-info-circle mr-1"></i> This is a placeholder for the interactive map
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-university text-primary-800 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campus Proximity</h3>
            <p className="text-gray-600">
              Our map will show you exactly how far each housing option is from your campus, 
              with walking, cycling, and public transit time estimates.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-bus text-primary-800 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transit Options</h3>
            <p className="text-gray-600">
              See nearby bus stops, train stations, and bike paths to better understand your 
              commute options from each potential home.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-store text-primary-800 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Amenities</h3>
            <p className="text-gray-600">
              Discover grocery stores, cafes, gyms, libraries, and other important amenities 
              in the neighborhood surrounding each housing option.
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          className="bg-primary-50 rounded-xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-2xl font-semibold text-primary-800 mb-4">Ready to explore housing options?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            While our map feature is in development, you can still browse our comprehensive listings 
            with detailed location information.
          </p>
          <button className="px-6 py-3 bg-primary-800 text-white rounded-md font-medium hover:bg-primary-700 transition-colors">
            Browse Listings
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Map;
