import React from 'react';

export const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <p className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Culture. All rights reserved. Built for smarter personal finance.
      </p>
    </div>
  </footer>
);
