import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

function AuthTest() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const { signUp, signIn, signInWithGoogle, signOut, user, userProfile, isAuthenticated } = useAuth();

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: formatDateDDMMYYYY(new Date()) }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Email validation
    addResult('Email Validation', 'running', 'Testing email domain validation...');
    try {
      const result = await signUp('invalid@gmail.com', 'password123', { name: 'Test User', role: 'mentee' });
      if (result.error && result.error.message.includes('git-india.edu.in')) {
        addResult('Email Validation', 'pass', 'Email domain validation working correctly');
      } else {
        addResult('Email Validation', 'fail', 'Email domain validation not working');
      }
    } catch (error) {
      addResult('Email Validation', 'fail', `Error: ${error.message}`);
    }

    // Test 2: Password validation
    addResult('Password Validation', 'running', 'Testing password length validation...');
    try {
      const result = await signUp('test@git-india.edu.in', '123', { name: 'Test User', role: 'mentee' });
      if (result.error && result.error.message.includes('6 characters')) {
        addResult('Password Validation', 'pass', 'Password validation working correctly');
      } else {
        addResult('Password Validation', 'fail', 'Password validation not working');
      }
    } catch (error) {
      addResult('Password Validation', 'fail', `Error: ${error.message}`);
    }

    // Test 3: Empty fields validation
    addResult('Empty Fields', 'running', 'Testing empty field validation...');
    try {
      const result = await signIn('', '');
      if (result.error && result.error.message.includes('required')) {
        addResult('Empty Fields', 'pass', 'Empty field validation working correctly');
      } else {
        addResult('Empty Fields', 'fail', 'Empty field validation not working');
      }
    } catch (error) {
      addResult('Empty Fields', 'fail', `Error: ${error.message}`);
    }

    // Test 4: Invalid credentials
    addResult('Invalid Credentials', 'running', 'Testing invalid login credentials...');
    try {
      const result = await signIn('nonexistent@git-india.edu.in', 'wrongpassword');
      if (result.error && result.error.message.includes('Invalid')) {
        addResult('Invalid Credentials', 'pass', 'Invalid credentials handling working correctly');
      } else {
        addResult('Invalid Credentials', 'fail', 'Invalid credentials handling not working');
      }
    } catch (error) {
      addResult('Invalid Credentials', 'fail', `Error: ${error.message}`);
    }

    // Test 5: Current authentication state
    addResult('Auth State', 'running', 'Checking current authentication state...');
    if (isAuthenticated && user) {
      addResult('Auth State', 'pass', `User authenticated: ${user.email}`);
      if (userProfile) {
        addResult('User Profile', 'pass', `Profile loaded: ${userProfile.name} (${userProfile.role})`);
      } else {
        addResult('User Profile', 'warning', 'User authenticated but profile not loaded');
      }
    } else {
      addResult('Auth State', 'info', 'No user currently authenticated');
    }

    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      case 'info': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      case 'running': return '🔄';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Authentication System Test</h1>

          {/* Current Auth Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Authenticated:</span>
                <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">User Email:</span>
                <span className="ml-2 text-gray-600">
                  {user?.email || 'None'}
                </span>
              </div>
              <div>
                <span className="font-medium">User Role:</span>
                <span className="ml-2 text-gray-600">
                  {userProfile?.role || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Running Tests...' : 'Run Authentication Tests'}
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
            {isAuthenticated && (
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            )}
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                    <span className="text-lg">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{result.test}</span>
                        <span className="text-xs text-gray-500">{result.timestamp}</span>
                      </div>
                      <p className={`text-sm ${getStatusColor(result.status)}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Test Actions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Quick Test Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Test Login with Existing User</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Try logging in with: hod@git-india.edu.in / password123
                </p>
                <a href="/login" className="text-blue-500 underline">Go to Login</a>
              </div>
              <div>
                <h3 className="font-medium mb-2">Test Signup</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Create a new account with @git-india.edu.in email
                </p>
                <a href="/signup" className="text-blue-500 underline">Go to Signup</a>
              </div>
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Development Mode Info</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Email verification is skipped in development</li>
              <li>• Test emails (atharvghosalkar22@gmail.com, test@gmail.com, admin@gmail.com) are allowed</li>
              <li>• Auto-login after signup is enabled</li>
              <li>• Session persistence is enabled</li>
              <li>• Google OAuth domain restriction is relaxed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthTest;
