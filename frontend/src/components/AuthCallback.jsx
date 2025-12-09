import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, userProfile, validateEmailDomain, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (isAuthenticated && user) {
          // Check if email domain is valid
          if (!validateEmailDomain(user.email)) {
            setError('Only @git-india.edu.in email addresses are allowed');
            setLoading(false);
            return;
          }

          console.log('Auth callback successful, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          // Wait for auth state to update
          const timeout = setTimeout(() => {
            if (!isAuthenticated) {
              setError('Authentication failed. Please try again.');
              setLoading(false);
            }
          }, 10000);

          return () => clearTimeout(timeout);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [isAuthenticated, user, navigate, validateEmailDomain]);

  if (loading) {
    return (
      <Loader />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-800">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default AuthCallback;
