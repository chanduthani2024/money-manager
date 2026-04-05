import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BudgetPage } from './pages/BudgetPage';
import { AddExpensePage } from './pages/AddExpensePage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { GoogleOAuthRedirectPage } from './pages/GoogleOAuthRedirectPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <div className="flex flex-col min-h-screen">
                    <Navbar />
                    <main className="flex-1 py-6">
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Routes>
                          <Route path="/" element={<DashboardPage />} />
                          <Route path="/budget" element={<BudgetPage />} />
                          <Route path="/add-expense" element={<AddExpensePage />} />
                          <Route path="/transactions" element={<TransactionsPage />} />
                          <Route path="/analytics" element={<AnalyticsPage />} />
                          <Route path="/categories" element={<CategoriesPage />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </PrivateRoute>
              }
            />
            <Route path="/auth/callback" element={<GoogleOAuthRedirectPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;