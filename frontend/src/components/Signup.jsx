import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');  // No default role
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, validateEmailDomain } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setEmailError('');
    setPasswordError('');
    setRoleError('');
    setServerMessage('');

    // Validate email domain
    if (!validateEmailDomain(email)) {
      setEmailError('Only @git-india.edu.in email addresses are allowed.');
      setLoading(false);
      return;
    }

    // Validate password
    if (password.length < 6) {
      setPasswordError('Password should be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Validate name
    if (!name.trim()) {
      setServerMessage('Name is required.');
      setLoading(false);
      return;
    }

    // Validate role
    if (!role) {
      setRoleError('Please select a role.');
      setLoading(false);
      return;
    }

    try {
      const { data, error, message } = await signUp(email.toLowerCase().trim(), password, {
        name: name.trim(),
        role: role
      });

      if (error) {
        setServerMessage(error.message);
        return;
      }

      if (data?.user) {
        // For development, skip email verification and login directly
        if (import.meta.env.DEV) {
          setServerMessage('Account created successfully! Logging you in...');

          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setRole('mentee');

          // Auto-login after successful signup in development
          try {
            const { data: loginData, error: loginError } = await signIn(email.toLowerCase().trim(), password);
            if (loginError) {
              console.log('Auto-login failed:', loginError.message);
              // Show success message instead of error, effectively guiding user to manual login/verification
              setServerMessage('Account created successfully! Please check your email and try to login.');
            } else {
              setServerMessage('Account created and logged in successfully!');

              // Redirect based on role
              setTimeout(() => {
                if (['project_coordinator', 'hod'].includes(role)) {
                  navigate('/role-selection');
                } else {
                  const dashboardPaths = {
                    mentee: '/components/dashboard/mentee',
                    mentor: '/components/dashboard/mentor'
                  };
                  navigate(dashboardPaths[role] || '/');
                }
              }, 1500);
            }
          } catch (err) {
            console.log('Auto-login error:', err.message);

            // Check if error is due to email verification
            if (err.message.includes('verify your email') || err.message.includes('Email not confirmed')) {
              const verificationMessage = 'Account created successfully! Please check your email to verify your account before logging in.';
              setServerMessage(verificationMessage);

              // Clear form
              setName('');
              setEmail('');
              setPassword('');
              setRole('mentee');

              setTimeout(() => {
                navigate('/verify-email');
              }, 3000);
            } else {
              setServerMessage('Account created successfully! Please try to login manually.');
            }
          }
        } else {
          // Production: Show verification message
          const verificationMessage = message || 'Account created successfully! Please check your email and click the verification link to complete registration.';
          setServerMessage(verificationMessage);

          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setRole('mentee');

          // Redirect to verification page after 3 seconds
          setTimeout(() => {
            navigate('/verify-email');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      setServerMessage('Error: Unable to register user');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setServerMessage('');

    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        setServerMessage(error.message);
        return;
      }

      // Google OAuth will redirect, so we don't need to handle navigation here
    } catch (error) {
      console.error('Google sign-up error:', error);
      setServerMessage('Failed to sign up with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-4 px-4 sm:px-6 lg:px-8" style={{ minHeight: '100vh' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Join our community today
          </p>
        </div>

        <div className="bg-white py-6 px-4 shadow-lg rounded-xl border border-gray-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className="appearance-none block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
                  placeholder="you@domain.edu.in"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {import.meta.env.DEV ? (
                    <>@git-india.edu.in emails only<br />
                      <span className="text-blue-600">Dev: Test emails accepted</span></>
                  ) : (
                    'Only @git-india.edu.in emails'
                  )}
                </p>
                {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="appearance-none block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 6 characters
                </p>
                {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <div className="mt-1">
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setRoleError('');
                  }}
                  className="appearance-none block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-300 bg-white"
                >
                  <option value="" disabled>Select your role</option>
                  <option value="mentee">Mentee</option>
                  <option value="mentor">Mentor</option>
                  <option value="project_coordinator">Coordinator</option>
                  <option value="hod">HOD</option>
                </select>
                {roleError && <p className="mt-1 text-xs text-red-600">{roleError}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full flex justify-center items-center py-2 px-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing up...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>
            </div>

            {serverMessage && (
              <div className={`rounded-md p-3 ${serverMessage.includes('successfully') ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-4 w-4 ${serverMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className={`text-xs font-medium ${serverMessage.includes('successfully') ? 'text-green-800' : 'text-red-800'}`}>
                      {serverMessage}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;