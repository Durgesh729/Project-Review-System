import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading, isAuthenticated, activeRole } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute check:', {
    requiredRole,
    userRole: userProfile?.role,
    activeRole,
    userProfileRoles: userProfile?.roles,
    isAuthenticated,
    user: user?.email
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return <Loader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for user profile to load
  if (!userProfile) {
    return <Loader />;
  }

  // Check if user has ANY role. If not, redirect to selection.
  // We check:
  // 1. activeRole
  // 2. userProfile.role (primary)
  // 3. userProfile.roles (array)
  const hasRole = activeRole || userProfile.role || (userProfile.roles && userProfile.roles.length > 0);

  if (!hasRole) {
    console.log('ProtectedRoute: No role found, redirecting to selection');
    return <Navigate to="/select-role" replace />;
  }

  // Check role-based access if required
  if (requiredRole) {
    // Use activeRole if available, otherwise fallback to primary role
    const currentRole = (activeRole || userProfile.role)?.toLowerCase();
    const requiredRoleLower = requiredRole.toLowerCase();

    if (currentRole !== requiredRoleLower) {
      // Redirect to appropriate dashboard based on user's actual role
      const role = currentRole;
      let redirectPath = '/';

      switch (role) {
        case 'mentee':
          redirectPath = '/components/dashboard/mentee';
          break;
        case 'mentor':
          redirectPath = '/components/dashboard/mentor';
          break;
        case 'hod':
          redirectPath = '/components/dashboard/hod';
          break;
        case 'project_coordinator':
          redirectPath = '/components/dashboard/coordinator';
          break;
        default:
          redirectPath = '/';
      }

      return <Navigate to={redirectPath} replace />;
    }
  }

  // Render the protected component
  console.log('ProtectedRoute: Access granted');
  return children;
}

export default ProtectedRoute;