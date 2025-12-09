import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function DatabaseChecker() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, message, data = null) => {
    setResults(prev => [...prev, { 
      test, 
      status, 
      message, 
      data,
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const runChecks = async () => {
    setLoading(true);
    setResults([]);

    // Check 1: Supabase connection
    addResult('Connection', 'running', 'Testing Supabase connection...');
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        addResult('Connection', 'fail', `Connection failed: ${error.message}`);
      } else {
        addResult('Connection', 'pass', 'Supabase connection successful');
      }
    } catch (error) {
      addResult('Connection', 'fail', `Connection error: ${error.message}`);
    }

    // Check 2: Auth users table
    addResult('Auth Users', 'running', 'Checking auth.users table...');
    try {
      const { data, error } = await supabase.rpc('get_auth_users');
      if (error) {
        addResult('Auth Users', 'warning', `Cannot access auth.users directly: ${error.message}`);
      } else {
        addResult('Auth Users', 'pass', `Found ${data?.length || 0} auth users`, data);
      }
    } catch (error) {
      addResult('Auth Users', 'warning', 'Auth users check skipped (expected in client)');
    }

    // Check 3: Public users table
    addResult('Public Users', 'running', 'Checking public.users table...');
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        addResult('Public Users', 'fail', `Error accessing users table: ${error.message}`);
      } else {
        addResult('Public Users', 'pass', `Found ${data?.length || 0} user profiles`, data);
      }
    } catch (error) {
      addResult('Public Users', 'fail', `Users table error: ${error.message}`);
    }

    // Check 4: Current user session
    addResult('Current Session', 'running', 'Checking current user session...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        addResult('Current Session', 'fail', `Session error: ${error.message}`);
      } else if (session) {
        addResult('Current Session', 'pass', `Active session for: ${session.user.email}`, session.user);
      } else {
        addResult('Current Session', 'info', 'No active session');
      }
    } catch (error) {
      addResult('Current Session', 'fail', `Session check error: ${error.message}`);
    }

    // Check 5: Test login with known credentials
    addResult('Test Login', 'running', 'Testing login with hod@git-india.edu.in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'hod@git-india.edu.in',
        password: 'password123'
      });
      
      if (error) {
        addResult('Test Login', 'fail', `Login failed: ${error.message}`);
      } else {
        addResult('Test Login', 'pass', `Login successful for: ${data.user.email}`);
        
        // Check if profile exists for this user
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          addResult('User Profile', 'fail', `Profile not found: ${profileError.message}`);
        } else {
          addResult('User Profile', 'pass', `Profile found: ${profile.name} (${profile.role})`, profile);
        }
      }
    } catch (error) {
      addResult('Test Login', 'fail', `Login test error: ${error.message}`);
    }

    setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Database & Authentication Checker</h1>
          
          <div className="mb-6">
            <button
              onClick={runChecks}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Running Checks...' : 'Run Database Checks'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{result.test}</h3>
                        <span className="text-xs text-gray-500">{result.timestamp}</span>
                      </div>
                      <p className={`text-sm ${getStatusColor(result.status)} mb-2`}>
                        {result.message}
                      </p>
                      {result.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            View Data
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h2 className="font-semibold mb-2">Instructions</h2>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Run the database checks above</li>
              <li>If any checks fail, run the QUICK_DB_SETUP.sql script in Supabase</li>
              <li>Make sure test users exist with correct profiles</li>
              <li>Verify the database trigger is working</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatabaseChecker;
