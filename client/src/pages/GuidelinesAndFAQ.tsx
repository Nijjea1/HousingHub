import { useState } from 'react';
import { motion } from 'framer-motion';
import { faqItems } from '@/lib/data';

const GuidelinesAndFAQ = () => {
  const [activeTab, setActiveTab] = useState('guidelines');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(2000);
  const [otherExpenses, setOtherExpenses] = useState(500);
  const [monthlyRent, setMonthlyRent] = useState(800);
  const [includeUtilities, setIncludeUtilities] = useState(true);
  const [utilities, setUtilities] = useState(150);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  // Item variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Calculate rent affordability
  const totalHousingCost = includeUtilities ? monthlyRent + utilities : monthlyRent;
  const housingPercentage = Math.round((totalHousingCost / monthlyIncome) * 100);
  const recommendedMax = Math.round(monthlyIncome * 0.3);
  const isExceedingRecommendation = housingPercentage > 30;
  const remainingAfterHousing = monthlyIncome - totalHousingCost - otherExpenses;
  const monthlySavingsGoal = 300;
  const onTrack = remainingAfterHousing >= monthlySavingsGoal;

  return (
    <div className="pt-32 pb-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <motion.h1 
            className="text-4xl font-bold text-primary-800 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Student Housing Resources
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Essential information and answers to common questions about student housing
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 overflow-x-auto">
          <div className="bg-white shadow-sm rounded-full p-1 inline-flex">
            <button
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'guidelines'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-700 hover:text-primary-800'
              }`}
              onClick={() => setActiveTab('guidelines')}
            >
              Guidelines
            </button>
            <button
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'faq'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-700 hover:text-primary-800'
              }`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ
            </button>
            <button
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'calculator'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-700 hover:text-primary-800'
              }`}
              onClick={() => setActiveTab('calculator')}
            >
              Rent Calculator
            </button>
            <button
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-700 hover:text-primary-800'
              }`}
              onClick={() => setActiveTab('tips')}
            >
              Living Tips
            </button>
          </div>
        </div>

        {/* Guidelines Content */}
        {activeTab === 'guidelines' && (
          <div className="space-y-8">
            <motion.div 
              className="bg-white rounded-xl shadow p-8 overflow-hidden"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="flex items-center gap-4 mb-6" variants={itemVariants}>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-search text-primary-800 text-xl"></i>
                </div>
                <h2 className="text-2xl font-semibold text-primary-800">Before You Begin Your Housing Search</h2>
              </motion.div>

              <motion.div 
                className="space-y-6"
                variants={containerVariants}
              >
                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-dollar-sign"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Determine Your Budget</h3>
                    <p className="text-gray-600">
                      Consider all expenses including rent, utilities, internet, groceries, transportation, and entertainment. 
                      Most financial advisors recommend that housing costs shouldn't exceed 30% of your income or financial aid.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Decide on Location Priorities</h3>
                    <p className="text-gray-600">
                      Think about what's most important to you: proximity to campus, access to public transportation, 
                      nearby amenities, safety of the neighborhood, etc. Our map feature can help you visualize distances.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-users"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Consider Roommates</h3>
                    <p className="text-gray-600">
                      Having roommates can significantly reduce your housing costs. However, make sure to discuss 
                      living habits, cleanliness expectations, and bill sharing before committing to a shared living arrangement.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Understand the Academic Calendar</h3>
                    <p className="text-gray-600">
                      Most student leases align with the academic year. Start your search 2-3 months before the 
                      semester begins to get the best options. Be aware of lease terms and whether you need summer housing as well.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl shadow p-8 overflow-hidden"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div className="flex items-center gap-4 mb-6" variants={itemVariants}>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-clipboard-check text-primary-800 text-xl"></i>
                </div>
                <h2 className="text-2xl font-semibold text-primary-800">What to Look for in a Student Rental</h2>
              </motion.div>

              <motion.div 
                className="space-y-6"
                variants={containerVariants}
              >
                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Safety Features</h3>
                    <p className="text-gray-600">
                      Check for working smoke detectors, carbon monoxide detectors, fire extinguishers, 
                      secure locks on doors and windows, and proper lighting in common areas and entrances.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-wifi"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Utilities and Internet</h3>
                    <p className="text-gray-600">
                      Clarify which utilities are included in rent and which you'll need to pay separately. 
                      For student housing, reliable high-speed internet is essential for coursework.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-tools"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance and Management</h3>
                    <p className="text-gray-600">
                      Research the landlord or property management company. How responsive are they to maintenance requests? 
                      Are there on-site staff? Check reviews from current or previous tenants if possible.
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-4">
                  <div className="mt-1 text-primary-600">
                    <i className="fas fa-book"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Study Space</h3>
                    <p className="text-gray-600">
                      As a student, you need a suitable place to study. Check if the unit has desk space 
                      or if the property has common study areas or quiet spaces.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* FAQ Content */}
        {activeTab === 'faq' && (
          <motion.div 
            className="bg-white rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-question text-primary-800 text-xl"></i>
              </div>
              <h2 className="text-2xl font-semibold text-primary-800">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    className={`flex justify-between items-center w-full px-6 py-4 text-left font-medium focus:outline-none ${
                      openIndex === index ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50 text-gray-800'
                    }`}
                    onClick={() => toggleQuestion(index)}
                  >
                    <span>{item.question}</span>
                    <span className="ml-6 flex-shrink-0 text-gray-500">
                      <i className={`fas ${openIndex === index ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    </span>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{ height: openIndex === index ? 'auto' : 0, opacity: openIndex === index ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-6 pb-4 pt-2 text-gray-600">
                      <p>{item.answer}</p>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rent Calculator */}
        {activeTab === 'calculator' && (
          <motion.div 
            className="bg-white rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-calculator text-primary-800 text-xl"></i>
              </div>
              <h2 className="text-2xl font-semibold text-primary-800">Student Rent Calculator</h2>
            </div>
            
            <p className="text-gray-600 mb-8">
              Plan your budget and determine what rent you can afford as a student.
            </p>

            {/* Calculator tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex -mb-px">
                <button className="px-6 py-3 border-b-2 border-primary-500 text-primary-700 font-medium">
                  Calculator
                </button>
                <button className="px-6 py-3 text-gray-500 hover:text-gray-700">
                  Tips & Resources
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left column - Budget information */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-money-bill-wave text-primary-800"></i>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900">Budget Information</h3>
                </div>
                <p className="text-gray-600 mb-6">Enter your financial details to calculate your affordability</p>

                <div className="space-y-6">
                  {/* Monthly Income */}
                  <div>
                    <label className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">Monthly Income</span>
                      <span className="font-medium text-primary-600">${monthlyIncome}</span>
                    </label>
                    <div className="relative mb-2">
                      <input 
                        type="range" 
                        min="500" 
                        max="5000" 
                        step="100" 
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>$500</span>
                      <span>$5,000</span>
                    </div>
                  </div>

                  {/* Other Monthly Expenses */}
                  <div>
                    <label className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">Other Monthly Expenses</span>
                      <span className="font-medium text-primary-600">${otherExpenses}</span>
                    </label>
                    <div className="relative mb-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="2000" 
                        step="50" 
                        value={otherExpenses}
                        onChange={(e) => setOtherExpenses(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>$0</span>
                      <span>$2,000</span>
                    </div>
                  </div>

                  {/* Monthly Rent */}
                  <div>
                    <label className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">Monthly Rent</span>
                      <span className="font-medium text-primary-600">${monthlyRent}</span>
                    </label>
                    <div className="relative mb-2">
                      <input 
                        type="range" 
                        min="400" 
                        max="3000" 
                        step="50" 
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>$400</span>
                      <span>$3,000</span>
                    </div>
                  </div>

                  {/* Utilities */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={includeUtilities} onChange={() => setIncludeUtilities(!includeUtilities)} className="sr-only peer" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-700">Include utilities in calculation</span>
                      </label>
                    </div>
                    
                    {includeUtilities && (
                      <>
                        <label className="flex justify-between mb-2">
                          <span className="font-medium text-gray-700">Monthly Utilities</span>
                          <span className="font-medium text-primary-600">${utilities}</span>
                        </label>
                        <div className="relative mb-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="500" 
                            step="10" 
                            value={utilities}
                            onChange={(e) => setUtilities(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>$0</span>
                          <span>$500</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right column - Affordability Analysis */}
              <div>
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chart-pie text-primary-800"></i>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900">Your Affordability Analysis</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Based on your input, here's your personalized rent affordability assessment</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-gray-500 text-sm mb-1">Your Portion of Rent + Utilities</div>
                      <div className="text-2xl font-bold text-primary-700">${totalHousingCost}</div>
                      <div className="text-xs text-gray-500">Total housing cost: ${totalHousingCost}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm mb-1">Remaining after Housing & Expenses</div>
                      <div className="text-2xl font-bold text-green-600">${remainingAfterHousing}</div>
                      <div className="text-xs text-gray-500">After paying rent and all other expenses</div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Income: ${monthlyIncome}</span>
                      <span>Recommended max: ${recommendedMax}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${housingPercentage > 40 ? 'bg-red-500' : housingPercentage > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(housingPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className={`${housingPercentage > 0 ? 'text-gray-600' : 'text-gray-400'}`}>0%</span>
                      <span className={`${housingPercentage >= 30 ? 'font-medium text-yellow-600' : 'text-gray-400'}`}>30%</span>
                      <span className={`${housingPercentage >= 50 ? 'font-medium text-red-600' : 'text-gray-400'}`}>50%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      You're spending <span className="font-medium">{housingPercentage}%</span> of income on housing
                    </div>
                  </div>
                  
                  {isExceedingRecommendation && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <i className="fas fa-exclamation-triangle text-red-500"></i>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Rent Exceeds Recommendation</h3>
                          <div className="mt-1 text-sm text-red-700">
                            This rent is more than the recommended 30% of your income. Consider finding roommates or a more affordable place.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-100 rounded-xl p-4">
                    <h4 className="font-medium mb-3">Budget Breakdown</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Housing ({housingPercentage}%)</span>
                          <span>${totalHousingCost}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${housingPercentage}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Other Expenses ({Math.round((otherExpenses / monthlyIncome) * 100)}%)</span>
                          <span>${otherExpenses}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.round((otherExpenses / monthlyIncome) * 100)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Remaining ({Math.round((remainingAfterHousing / monthlyIncome) * 100)}%)</span>
                          <span>${remainingAfterHousing}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.round((remainingAfterHousing / monthlyIncome) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-primary-800 mb-2">Our Recommendation</h3>
                  <p className="text-primary-700 mb-4">
                    {isExceedingRecommendation 
                      ? `Consider a more affordable option or finding roommates to share costs. Aim for rent below $${recommendedMax} to stay within the recommended 30% of income.` 
                      : `Your housing budget looks sustainable! Remember to set aside savings each month for emergencies and future expenses.`}
                  </p>
                  <div className="flex justify-between text-sm text-primary-600 mb-1">
                    <span>Monthly savings goal: $300</span>
                    <span>On track: ${remainingAfterHousing}</span>
                  </div>
                  <div className="w-full bg-primary-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${onTrack ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(Math.round((remainingAfterHousing / 300) * 100), 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-primary-600 mt-2">
                    Your savings goal: ${onTrack ? 'On track!' : 'Need to reduce expenses'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Living Tips */}
        {activeTab === 'tips' && (
          <motion.div 
            className="bg-white rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-lightbulb text-primary-800 text-xl"></i>
              </div>
              <h2 className="text-2xl font-semibold text-primary-800">Student Living Tips</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Saving Money */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-piggy-bank text-blue-600"></i>
                  </div>
                  <h3 className="text-xl font-medium text-blue-800">Saving Money on Rent</h3>
                </div>
                
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                    <span className="text-gray-700">Consider moving slightly further from campus for lower rent prices.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                    <span className="text-gray-700">Share housing with roommates to split costs on rent and utilities.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                    <span className="text-gray-700">Look for housing with utilities included to simplify budgeting.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                    <span className="text-gray-700">Consider becoming a Resident Assistant (RA) for reduced or free housing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-blue-500 mt-1"></i>
                    <span className="text-gray-700">Use your student status to ask for discounts from landlords.</span>
                  </li>
                </ul>
                
                <div className="bg-blue-100 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <span className="font-medium">Pro Tip:</span> Many landlords offer discounts for paying several months of rent upfront or signing a longer lease term.
                  </p>
                </div>
              </div>
              
              {/* Roommate Harmony */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-purple-600"></i>
                  </div>
                  <h3 className="text-xl font-medium text-purple-800">Roommate Harmony</h3>
                </div>
                
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-purple-500 mt-1"></i>
                    <span className="text-gray-700">Create a roommate agreement outlining responsibilities and expectations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-purple-500 mt-1"></i>
                    <span className="text-gray-700">Establish clear communication channels for addressing concerns.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-purple-500 mt-1"></i>
                    <span className="text-gray-700">Set up a rotating chore schedule to maintain a clean living space.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-purple-500 mt-1"></i>
                    <span className="text-gray-700">Discuss guest policies to respect everyone's privacy and comfort.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-purple-500 mt-1"></i>
                    <span className="text-gray-700">Use a shared app to track and split household expenses fairly.</span>
                  </li>
                </ul>
                
                <div className="bg-purple-100 rounded-lg p-4">
                  <p className="text-purple-800 text-sm">
                    <span className="font-medium">Pro Tip:</span> Schedule regular roommate meetings to discuss any issues before they become major problems.
                  </p>
                </div>
              </div>
              
              {/* Energy Saving */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 shadow-sm border border-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-leaf text-green-600"></i>
                  </div>
                  <h3 className="text-xl font-medium text-green-800">Energy Saving Tips</h3>
                </div>
                
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <span className="text-gray-700">Use power strips to completely turn off electronics when not in use.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <span className="text-gray-700">Replace incandescent bulbs with LED bulbs for energy efficiency.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <span className="text-gray-700">Use cold water for laundry and run full loads to save energy.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <span className="text-gray-700">Keep thermostats at energy-efficient temperatures (68°F in winter, 78°F in summer).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <span className="text-gray-700">Use fans instead of AC when possible and dress for the weather.</span>
                  </li>
                </ul>
                
                <div className="bg-green-100 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    <span className="font-medium">Pro Tip:</span> Many utility companies offer free energy audits to help identify ways to reduce your energy consumption.
                  </p>
                </div>
              </div>
              
              {/* Safety & Security */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 shadow-sm border border-yellow-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-shield-alt text-yellow-600"></i>
                  </div>
                  <h3 className="text-xl font-medium text-yellow-800">Safety & Security</h3>
                </div>
                
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-yellow-500 mt-1"></i>
                    <span className="text-gray-700">Always keep doors and windows locked, even when you're home.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-yellow-500 mt-1"></i>
                    <span className="text-gray-700">Get to know your neighbors and create a community watch.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-yellow-500 mt-1"></i>
                    <span className="text-gray-700">Test smoke detectors and carbon monoxide detectors monthly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-yellow-500 mt-1"></i>
                    <span className="text-gray-700">Have an emergency plan and know the quickest exits from your building.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-yellow-500 mt-1"></i>
                    <span className="text-gray-700">Save emergency contacts and join any campus safety alert systems.</span>
                  </li>
                </ul>
                
                <div className="bg-yellow-100 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <span className="font-medium">Pro Tip:</span> Consider renter's insurance, which is often affordable for students and protects your belongings.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GuidelinesAndFAQ;