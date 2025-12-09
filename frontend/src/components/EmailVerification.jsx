import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

function EmailVerification() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      }
    } catch (error) {
      setMessage('Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            Please check your email and click the verification link to activate your account.
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">What to do next:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Check your email inbox</li>
            <li>2. Look for an email from your app</li>
            <li>3. Click the verification link</li>
            <li>4. Return here to login</li>
          </ol>
        </div>

        <form onSubmit={handleResendVerification} className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Didn't receive the email? Enter your email to resend:
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </form>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('Error') || message.includes('Failed')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-600">
            Already verified your email?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Login here
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Need to create an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-500 text-center">
            <strong>Note:</strong> Check your spam/junk folder if you don't see the verification email in your inbox.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification;
