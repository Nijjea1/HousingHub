import { useState } from 'react';
import { faqItems } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm p-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-semibold text-primary-800 mb-8 text-center">Frequently Asked Questions</h2>
      
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div 
            key={index} 
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              className={`flex justify-between items-center w-full px-6 py-4 text-left font-medium focus:outline-none ${
                openIndex === index ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleQuestion(index)}
            >
              <span className="text-gray-900">{item.question}</span>
              <span className="ml-6 flex-shrink-0 text-gray-500">
                <i className={`fas ${openIndex === index ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </span>
            </button>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-6 pb-4 pt-2 text-gray-600">
                    <p>{item.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default FAQ;
