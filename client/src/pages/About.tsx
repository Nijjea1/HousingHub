import { motion } from 'framer-motion';
import FAQ from '@/components/FAQ';

const About = () => {
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
            About LetMeKnock
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Simplifying student housing search since 2023
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-semibold text-primary-800 mb-4">Our Mission</h2>
            <p className="text-gray-600 mb-4">
              LetMeKnock was founded with a simple mission: to make finding student housing as 
              easy and stress-free as possible. We understand that searching for a place to live 
              while focusing on your studies can be overwhelming.
            </p>
            <p className="text-gray-600 mb-4">
              That's why we've created a platform specifically designed for students, with features 
              that prioritize what matters most to you: proximity to campus, affordability, and 
              amenities that support your academic success.
            </p>
            <p className="text-gray-600">
              Our goal is to connect students with housing options that feel like home, allowing 
              you to focus on what really matters - your education and college experience.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-primary-50 rounded-xl p-8"
          >
            <h2 className="text-2xl font-semibold text-primary-800 mb-4">Why Choose Us?</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1 mr-3">
                  <i className="fas fa-check text-primary-800 text-xs"></i>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">Student-Focused Platform:</span> Built specifically for students with features addressing your unique housing needs.
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1 mr-3">
                  <i className="fas fa-check text-primary-800 text-xs"></i>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">Campus Proximity:</span> All listings are organized by their distance from campus and nearby amenities.
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1 mr-3">
                  <i className="fas fa-check text-primary-800 text-xs"></i>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">Verified Listings:</span> We ensure all property information is accurate and up-to-date.
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1 mr-3">
                  <i className="fas fa-check text-primary-800 text-xs"></i>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">Student Community:</span> Connect with other students looking for roommates or housing advice.
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1 mr-3">
                  <i className="fas fa-check text-primary-800 text-xs"></i>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">Resource Hub:</span> Access guides, tips, and tools to help navigate your housing search.
                </p>
              </li>
            </ul>
          </motion.div>
        </div>

        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-primary-800 mb-6 text-center">Our Future Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-user-shield text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Authentication</h3>
              <p className="text-gray-600">
                We're implementing secure login options with OAuth 2.0 to provide personalized experiences 
                while protecting your data.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-comments text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Messaging System</h3>
              <p className="text-gray-600">
                Soon you'll be able to directly message landlords and potential roommates through 
                our secure in-app messaging platform.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-robot text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Chatbot Support</h3>
              <p className="text-gray-600">
                We're developing an AI assistant to answer your housing questions instantly and 
                help find listings that match your specific needs.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-calendar-alt text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Viewing Scheduler</h3>
              <p className="text-gray-600">
                Schedule property viewings directly through our platform with automated reminders 
                and confirmation systems.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-file-signature text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Leasing</h3>
              <p className="text-gray-600">
                We're implementing secure online lease signing with encryption to streamline the 
                rental process from search to move-in.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-database text-primary-800 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dynamic Listings</h3>
              <p className="text-gray-600">
                Our database integration will allow real-time updates of available properties 
                and instant notifications for new listings that match your criteria.
              </p>
            </div>
          </div>
        </motion.div>

        <FAQ />
      </div>
    </div>
  );
};

export default About;
