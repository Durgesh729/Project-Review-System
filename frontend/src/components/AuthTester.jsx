import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function AuthTester() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [testEmail] = useState('testuser@git-india.edu.in');
  const [testPassword] = useState('TestPassword123!');

  const addResult = (testName, result) => {
    setResults(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults({});

    try {
      // Test 1: Check Supabase Connection
      addResult('connection', { status: 'testing', message: 'Testing connection...' });
      try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        addResult('connection', { 
          status: error ? 'failed' : 'success', 
          message: error ? error.message : 'Connection successful',
          data: data
        });
      } catch (err) {
        addResult('connection', { status: 'failed', message: err.message });
      }

      // Test 2: Test Signup
      addResult('signup', { status: 'testing', message: 'Testing signup...' });
      try {
        // First, try to delete existing user if any
        await supabase.auth.admin.deleteUser(testEmail);
        
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: {
              name: 'Test User',
              role: 'mentee'
            }
          }
        });

        addResult('signup', {
          status: signupError ? 'failed' : 'success',
          message: signupError ? signupError.message : 'Signup successful',
          data: signupData?.user ? { id: signupData.user.id, email: signupData.user.email } : null
        });
      } catch (err) {
        addResult('signup', { status: 'failed', message: err.message });
      }

      // Wait a moment for user creation trigger
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 3: Test Login
      addResult('login', { status: 'testing', message: 'Testing login...' });
      try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });

        addResult('login', {
          status: loginError ? 'failed' : 'success',
          message: loginError ? loginError.message : 'Login successful',
          data: loginData?.user ? { 
            id: loginData.user.id, 
            email: loginData.user.email,
            email_confirmed: loginData.user.email_confirmed_at ? 'Yes' : 'No'
          } : null
        });

        // Test 4: Check User Profile Creation
        if (loginData?.user) {
          addResult('profile', { status: 'testing', message: 'Checking user profile...' });
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', loginData.user.id)
              .single();

            addResult('profile', {
              status: profileError ? 'failed' : 'success',
              message: profileError ? profileError.message : 'Profile found',
              data: profileData
            });
          } catch (err) {
            addResult('profile', { status: 'failed', message: err.message });
          }
        }

      } catch (err) {
        addResult('login', { status: 'failed', message: err.message });
      }

      // Test 5: Test Wrong Password
      addResult('wrongPassword', { status: 'testing', message: 'Testing wrong password...' });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'WrongPassword!'
        });

        addResult('wrongPassword', {
          status: error ? 'success' : 'failed', // We expect this to fail
          message: error ? `Correctly rejected: ${error.message}` : 'ERROR: Wrong password was accepted!',
          data: null
        });
      } catch (err) {
        addResult('wrongPassword', { status: 'success', message: `Correctly rejected: ${err.message}` });
      }

      // Test 6: Check Auth State
      addResult('authState', { status: 'testing', message: 'Checking auth state...' });
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        addResult('authState', {
          status: error ? 'failed' : 'success',
          message: error ? error.message : session ? 'User is authenticated' : 'No active session',
          data: session?.user ? {
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role
          } : null
        });
      } catch (err) {
        addResult('authState', { status: 'failed', message: err.message });
      }

    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults({});
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    addResult('signOut', { status: 'success', message: 'Signed out successfully' });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🧪 Authentication System Tester</h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Test Configuration:</h3>
        <p className="text-sm text-blue-700">Email: {testEmail}</p>
        <p className="text-sm text-blue-700">Password: {testPassword}</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={clearResults}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Clear Results
        </button>

        <button
          onClick={signOut}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([testName, result]) => (
          <div key={testName} className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold capitalize">{testName.replace(/([A-Z])/g, ' $1')}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                result.status === 'success' ? 'bg-green-100 text-green-800' :
                result.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {result.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{result.message}</p>
            
            {result.data && (
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      {Object.keys(results).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Click "Run All Tests" to start testing the authentication system
        </div>
      )}
    </div>
  );
}

export default AuthTester;
