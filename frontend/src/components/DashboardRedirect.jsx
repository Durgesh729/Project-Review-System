import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, userProfile, activeRole, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('DashboardRedirect - User:', user);
    console.log('DashboardRedirect - UserProfile:', userProfile);
    console.log('DashboardRedirect - ActiveRole:', activeRole);
    console.log('DashboardRedirect - IsAuthenticated:', isAuthenticated);

    if (!isAuthenticated || !user) {
      console.log('Redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // Wait for userProfile to be available
    if (!userProfile) {
      console.log('Waiting for user profile to load...');
      return;
    }

    // Check if user has a pending role OR no role
    if (userProfile.role === 'pending' || !userProfile.role) {
      // Also check if they have no roles array or empty roles array
      if (!userProfile.roles || userProfile.roles.length === 0) {
        console.log('User has no role, redirecting to role selection');
        navigate('/select-role', { replace: true });
        return;
      }
    }

    // Use activeRole if available, otherwise fallback to first role or primary role
    const dashboardPaths = {
      mentee: '/components/dashboard/mentee',
      mentor: '/components/dashboard/mentor',
      hod: '/components/dashboard/hod',
      project_coordinator: '/components/dashboard/coordinator',
    };

    let roleToUse = activeRole;

    // Validate if activeRole (e.g. from localStorage) is actually valid for this user
    if (roleToUse) {
      const userRoles = new Set([
        userProfile.role,
        ...(userProfile.roles || [])
      ].filter(Boolean).map(r => r.toLowerCase()));

      if (!userRoles.has(roleToUse.toLowerCase())) {
        console.warn(`Active role ${roleToUse} not found in user profile. invalidating.`);
        roleToUse = null;
      }
    }

    if (!roleToUse) {
      roleToUse = (userProfile.roles && userProfile.roles.length > 0)
        ? userProfile.roles[0]
        : userProfile.role;
    }

    // If still no role (should be caught above, but safety check), redirect to selection
    if (!roleToUse) {
      console.log('No role determined, redirecting to selection');
      navigate('/select-role', { replace: true });
      return;
    }

    const dashboardPath = dashboardPaths[roleToUse];

    // If invalid role (not in map), redirect to selection
    if (!dashboardPath) {
      console.warn(`Unknown role: ${roleToUse}, redirecting to selection`);
      navigate('/select-role', { replace: true });
      return;
    }

    console.log(`Dashboard redirect: ${user.email} -> ${dashboardPath} (role: ${roleToUse})`);
    navigate(dashboardPath, { replace: true });
  }, [user, userProfile, activeRole, isAuthenticated, navigate]);

  return (
    <Loader />
  );
}

export default DashboardRedirect;
