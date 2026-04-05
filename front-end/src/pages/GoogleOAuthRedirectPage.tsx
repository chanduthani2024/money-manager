import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const GoogleOAuthRedirectPage: React.FC = () => {
  const { oauthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      oauthLogin(token).then(() => {
        toast.success('Login successful!');
        navigate('/');
      }).catch(() => {
        toast.error('Authentication failed');
        navigate('/login');
      });
    } else if (error) {
      toast.error(error);
      navigate('/login');
    } else {
      toast.error('Authentication failed');
      navigate('/login');
    }
  }, [searchParams, oauthLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};