import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  IndianRupee,
  Plus,
  Settings,
  LogOut,
  Sparkles,
  Calendar,
  Tag,
  HelpCircle,
} from 'lucide-react';

interface NavbarProps {
  onStartTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartTour }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard', tour: 'dashboard' },
    { to: '/budget', icon: IndianRupee, label: 'Budget', tour: 'budget' },
    { to: '/add-expense', icon: Plus, label: 'Add Expense', tour: 'add-expense' },
    { to: '/transactions', icon: Calendar, label: 'Transactions', tour: 'transactions' },
    { to: '/categories', icon: Tag, label: 'Categories', tour: 'categories' },
    { to: '/settings', icon: Settings, label: 'Settings', tour: 'settings' },
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Sparkles className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold text-gray-800">Culture</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-tour={item.tour}
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-sm hidden sm:block">
              Welcome, {user?.firstName}!
            </span>
            {onStartTour && (
              <button
                onClick={onStartTour}
                title="Take a tour"
                className="inline-flex items-center px-2 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tour</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};