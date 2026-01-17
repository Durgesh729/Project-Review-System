import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function RoleSelection() {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, userProfile, updateActiveRole, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile?.role) {
      // Initialize with current primary role if not already in list
      if (selectedRoles.length === 0) {
        setSelectedRoles([userProfile.role]);
      }
    }
  }, [userProfile]);

  // Redirect logic check
  useEffect(() => {
    if (userProfile && userProfile.role !== 'pending') {
      // If user is mentee or mentor, they shouldn't generally be here, redirect
      if (['mentee', 'mentor'].includes(userProfile.role)) {
        const dashboardPaths = {
          mentee: '/components/dashboard/mentee',
          mentor: '/components/dashboard/mentor',
        };
        // However, if they just signed up, they might be here temporarily. 
        // But for Mentee/Mentor rules say "No multiple role selection".
        // navigate(dashboardPaths[userProfile.role], { replace: true });
      }
    }
  }, [userProfile, navigate]);

  const handleCheckboxChange = (role) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Prevent removing the primary role if it's the only one? 
        // Or just allow modification. User requirement says "Allow selecting any roles except Mentee".
        // But primary role usually defines their main identity. Let's allowing toggling others.
        // If they uncheck everything, valid? Probably need at least one.
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (selectedRoles.length === 0) {
      setError('Please select at least one role.');
      setLoading(false);
      return;
    }

    try {
      // STRICT OVERRIDE POLICY:
      // When selecting a role here, we treat it as the definitive "fresh start".
      // We do NOT merge with previous roles (which might be 'pending' or from a deleted account).

      let finalRoles = [...selectedRoles];

      // The Primary Role is simply the first selected role (or the only one).
      // For multi-select (Coord/HOD), the logic might allow multiple, but one must be primary.
      // In this specific UI, the primary role is usually implied by the context or the first selection.
      // However, if we are in the "Select Additional Roles" mode (Coord/HOD), we SHOULD preserve the primary.

      let primaryRole = selectedRoles[0];

      // If the user ALREADY has a valid primary role (e.g. Coordinator adding Mentor), keep it.
      if (userProfile.role && userProfile.role !== 'pending') {
        primaryRole = userProfile.role;
        // Ensure it's in the list
        if (!finalRoles.includes(primaryRole)) {
          finalRoles.push(primaryRole);
        }
      }

      const updates = {
        role: primaryRole, // Update primary role column
        roles: finalRoles, // Overwrite roles array
        updated_at: new Date()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local context
      const updatedProfile = { ...userProfile, roles: finalRoles };
      updateUserProfile(updatedProfile);

      // Navigate to primary dashboard
      const dashboardPaths = {
        mentee: '/components/dashboard/mentee',
        mentor: '/components/dashboard/mentor',
        hod: '/components/dashboard/hod',
        project_coordinator: '/components/dashboard/coordinator',
      };

      const dashboardPath = dashboardPaths[primaryRole] || dashboardPaths.mentee;

      navigate(dashboardPath, { replace: true });

    } catch (error) {
      console.error('Role update error:', error);
      setError('Failed to update roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should show multi-select
  // Rules: "If the user signs up as COORDINATOR or HOD... Show Multiple Role Selection Page."
  const isMultiSelectEligible = ['project_coordinator', 'hod'].includes(userProfile?.role);

  if (!userProfile) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h3 className="font-bold text-lg mb-4 text-center">
          {isMultiSelectEligible ? 'Select Additional Roles' : 'Confirm Your Role'}
        </h3>
        <p className="text-sm text-gray-600 mb-6 text-center">
          {isMultiSelectEligible
            ? `As a ${userProfile.role === 'project_coordinator' ? 'Coordinator' : 'HOD'}, you may select additional roles.`
            : 'Please confirm your role to continue.'}
        </p>

        <form onSubmit={handleRoleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Available Roles:</label>
            <div className="space-y-3">
              {/* Logic for Multi-Select (Coord/HOD) */}
              {isMultiSelectEligible && (
                <>
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('mentor')}
                      onChange={() => handleCheckboxChange('mentor')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="font-medium block">Mentor</span>
                      <span className="text-xs text-gray-500">Faculty guiding students</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('project_coordinator')}
                      onChange={() => handleCheckboxChange('project_coordinator')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={userProfile.role === 'project_coordinator'} // Keep primary mandatory
                    />
                    <div className="ml-3">
                      <span className="font-medium block">Coordinator</span>
                      <span className="text-xs text-gray-500">Managing project activities</span>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('hod')}
                      onChange={() => handleCheckboxChange('hod')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={userProfile.role === 'hod'} // Keep primary mandatory
                    />
                    <div className="ml-3">
                      <span className="font-medium block">HOD</span>
                      <span className="text-xs text-gray-500">Head of Department</span>
                    </div>
                  </label>
                </>
              )}

              {/* Logic for Initial Selection (Pending) */}
              {userProfile.role === 'pending' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Select your primary role:</p>
                  {['mentee', 'mentor', 'project_coordinator', 'hod'].map((roleOption) => (
                    <label key={roleOption} className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer ${selectedRoles.includes(roleOption) ? 'border-blue-500 bg-blue-50' : ''}`}>
                      <input
                        type="radio"
                        name="primaryRole"
                        checked={selectedRoles.includes(roleOption)}
                        onChange={() => {
                          // For primary selection, we only allow one
                          setSelectedRoles([roleOption]);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <span className="font-medium block capitalize">{roleOption.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Fallback or non-eligible view */}
              {!isMultiSelectEligible && userProfile.role !== 'pending' && (
                <div className="p-3 bg-gray-50 rounded-md border text-center">
                  <span className="font-medium text-gray-700">
                    {userProfile.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'Loading...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            {loading ? 'Saving...' : 'Continue to Dashboard'}
          </button>

          {error && (
            <p className="text-center text-red-500 text-sm mt-3">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default RoleSelection;