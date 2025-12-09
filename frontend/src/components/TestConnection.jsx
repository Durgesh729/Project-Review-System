import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function TestConnection() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const { user, userProfile, isAuthenticated } = useAuth();

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test 1: Database Connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      results.connection = connectionError ? 'Failed' : 'Success';

      // Test 2: User Authentication
      results.authentication = isAuthenticated ? 'Logged In' : 'Not Logged In';
      results.userEmail = user?.email || 'No user';
      results.userProfile = userProfile ? 'Profile Loaded' : 'No Profile';

      // Test 3: Fetch Users (if authenticated)
      if (isAuthenticated) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .limit(5);
        
        results.usersQuery = usersError ? `Error: ${usersError.message}` : `Found ${users?.length || 0} users`;
      }

      // Test 4: Fetch Projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, domain, status')
        .limit(5);
      
      results.projectsQuery = projectsError ? `Error: ${projectsError.message}` : `Found ${projects?.length || 0} projects`;

      // Test 5: Test Project Creation (if authenticated)
      if (isAuthenticated && userProfile?.role) {
        try {
          const testProject = {
            title: 'Test Project ' + Date.now(),
            domain: 'Web Development',
            description: 'Test project for verification',
            status: 'active'
          };

          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert([testProject])
            .select()
            .single();

          if (createError) {
            results.projectCreation = `Error: ${createError.message}`;
          } else {
            results.projectCreation = 'Success - Project created';
            
            // Clean up - delete the test project
            await supabase
              .from('projects')
              .delete()
              .eq('id', newProject.id);
          }
        } catch (err) {
          results.projectCreation = `Error: ${err.message}`;
        }
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
      results.error = error.message;
      setTestResults(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, [isAuthenticated, userProfile]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">System Connection Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700">Authentication Status</h3>
          <p className={`text-sm ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            {testResults.authentication}
          </p>
          <p className="text-xs text-gray-600">{testResults.userEmail}</p>
          <p className="text-xs text-gray-600">{testResults.userProfile}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700">Database Connection</h3>
          <p className={`text-sm ${testResults.connection === 'Success' ? 'text-green-600' : 'text-red-600'}`}>
            {testResults.connection || 'Testing...'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h4 className="font-medium text-gray-700">Users Query Test</h4>
          <p className="text-sm text-gray-600">{testResults.usersQuery || 'Not tested (login required)'}</p>
        </div>

        <div className="p-4 border rounded">
          <h4 className="font-medium text-gray-700">Projects Query Test</h4>
          <p className="text-sm text-gray-600">{testResults.projectsQuery || 'Testing...'}</p>
        </div>

        <div className="p-4 border rounded">
          <h4 className="font-medium text-gray-700">Project Creation Test</h4>
          <p className="text-sm text-gray-600">{testResults.projectCreation || 'Not tested (login required)'}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Run Tests Again'}
        </button>

        {!isAuthenticated && (
          <a
            href="/login"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Login to Test More Features
          </a>
        )}
      </div>

      {testResults.error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">Error: {testResults.error}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-800 mb-2">Test Accounts Available:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• HOD: hod@git-india.edu.in / password123</p>
          <p>• Mentor: mentor@git-india.edu.in / password123</p>
          <p>• Mentee: mentee@git-india.edu.in / password123</p>
        </div>
      </div>
    </div>
  );
}

export default TestConnection;
