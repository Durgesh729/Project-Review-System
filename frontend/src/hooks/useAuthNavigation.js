import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useAuthNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userProfile, loading } = useAuth();

  useEffect(() => {
    console.log('useAuthNavigation:', { 
      loading, 
      isAuthenticated, 
      userProfile: userProfile?.role, 
      currentPath: location.pathname 
    });

    // Don't navigate if still loading
    if (loading) {
      console.log('Still loading, not navigating');
      return;
    }

    // Don't navigate if user is not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, not navigating');
      return;
    }

    // Wait for user profile to load
    if (!userProfile?.role) {
      console.log('No user profile/role yet, waiting...');
      return;
    }

    // Don't redirect if user is already on a dashboard
    const currentPath = location.pathname;
    const isDashboardPage = currentPath.includes('dashboard');
    
    if (isDashboardPage) {
      console.log('Already on dashboard, not redirecting');
      return;
    }

    // Navigate to appropriate dashboard based on role
    const role = userProfile.role.toLowerCase();
    let dashboardPath = '/';

    switch (role) {
      case 'mentee':
        dashboardPath = '/mentee-dashboard';
        break;
      case 'mentor':
        dashboardPath = '/mentor-dashboard';
        break;
      case 'hod':
        dashboardPath = '/hod-dashboard';
        break;
      case 'project_coordinator':
        dashboardPath = '/project-coordinator-dashboard';
        break;
      default:
        dashboardPath = '/';
    }

    console.log(`Navigating to ${dashboardPath} for role: ${role}`);
    navigate(dashboardPath, { replace: true });
  }, [isAuthenticated, userProfile, loading, navigate, location.pathname]);

  return {
    isAuthenticated,
    userProfile,
    loading
  };
};
