import { Link } from 'wouter';
import { motion } from 'framer-motion';

const CTASection = () => {
  return (
    <section className="py-20 bg-primary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2 
          className="text-3xl md:text-4xl font-bold text-primary-800 mb-6"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Ready to Find Your Student Home?
        </motion.h2>
        <motion.p 
          className="text-lg text-gray-600 max-w-3xl mx-auto mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join thousands of students who have found their perfect housing with LetMeKnock. Start browsing now!
        </motion.p>
        <motion.div 
          className="flex flex-col sm:flex-row justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/listings">
            <div className="px-8 py-4 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-lg cursor-pointer">
              Browse Listings
            </div>
          </Link>
          <Link href="/about">
            <div className="px-8 py-4 bg-white text-primary-800 border border-primary-800 rounded-lg font-medium hover:bg-primary-50 transition-colors shadow-lg cursor-pointer">
              Learn More
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
