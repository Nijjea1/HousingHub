import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo and About */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                <i className="fas fa-house-user text-primary-800 text-xl"></i>
              </div>
              <span className="text-white font-bold text-xl">LetMeKnock</span>
            </div>
            <p className="text-gray-400 mb-6">
              Simplifying student housing search since 2023. Find your perfect place near campus.
            </p>
            <div className="flex space-x-4">
              <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="fab fa-facebook-f"></i>
              </div>
              <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="fab fa-twitter"></i>
              </div>
              <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="fab fa-instagram"></i>
              </div>
              <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="fab fa-linkedin-in"></i>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Home</div>
                </Link>
              </li>
              <li>
                <Link href="/listings">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Browse Listings</div>
                </Link>
              </li>
              <li>
                <Link href="/map">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">View Map</div>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">About Us</div>
                </Link>
              </li>
              <li>
                <Link href="/resources">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Guidelines</div>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/resources">
                  <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">FAQ</div>
                </Link>
              </li>
              <li>
                <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Moving Tips</div>
              </li>
              <li>
                <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Roommate Finder</div>
              </li>
              <li>
                <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Student Guides</div>
              </li>
              <li>
                <div className="text-gray-400 hover:text-white transition-colors cursor-pointer">Safety Tips</div>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <i className="fas fa-map-marker-alt mt-1 mr-3 text-gray-400"></i>
                <span className="text-gray-400">123 Campus Drive, College Town, USA</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-envelope mt-1 mr-3 text-gray-400"></i>
                <span className="text-gray-400">info@letmeknock.com</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-phone mt-1 mr-3 text-gray-400"></i>
                <span className="text-gray-400">(123) 456-7890</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright and Policies */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; 2023 LetMeKnock. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <div className="text-gray-500 hover:text-gray-400 text-sm cursor-pointer">Privacy Policy</div>
              <div className="text-gray-500 hover:text-gray-400 text-sm cursor-pointer">Terms of Service</div>
              <div className="text-gray-500 hover:text-gray-400 text-sm cursor-pointer">Cookie Policy</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
