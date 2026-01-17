import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleSwitcher from './RoleSwitcher';
import { FaCog, FaSun, FaMoon, FaTrash, FaSignOutAlt, FaUser } from 'react-icons/fa';

const Navbar = () => {
  // .1 - Hooks setup
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const { user, userProfile, activeRole, isAuthenticated, signOut } = useAuth();

  // .2 - Scroll effect for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // .2.1 - Click outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsMenu && !event.target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettingsMenu]);

  useEffect(() => {
    if (userProfile) {
      console.log('Navbar active role:', activeRole, 'available roles:', userProfile.roles);
    }
  }, [activeRole, userProfile]);

  // .3 - Base Navbar links
  const baseLinks = [
    { path: '/', label: 'Home' },
    { path: '/projects', label: 'Projects' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' }
  ];

  // .3.1 - Get dashboard link based on user role
  const getDashboardLink = () => {
    if (!isAuthenticated || !userProfile?.role) return null;

    // Use activeRole if available, otherwise fallback to primary role
    const currentRole = (activeRole || userProfile.role)?.toLowerCase();

    switch (currentRole) {
      case 'mentee':
        return { path: '/components/dashboard/mentee', label: 'Dashboard' };
      case 'mentor':
        return { path: '/components/dashboard/mentor', label: 'Dashboard' };
      case 'hod':
        return { path: '/components/dashboard/hod', label: 'Dashboard' };
      case 'project_coordinator':
        return { path: '/components/dashboard/coordinator', label: 'Dashboard' };
      default:
        return null;
    }
  };

  // .3.2 - Build final nav links (insert Dashboard after Home when logged-in)
  const navLinks = useMemo(() => {
    const links = [...baseLinks];
    const dashboardLink = getDashboardLink();
    if (dashboardLink) {
      // Insert after Home (index 1)
      links.splice(1, 0, { path: dashboardLink.path, label: 'Dashboard' });
    }
    return links;
  }, [isAuthenticated, userProfile, activeRole]);

  // .3.3 - Logout handler
  const handleLogout = async () => {
    try {
      setIsMobileMenuOpen(false);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  // .3.3 - Theme toggle handler
  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setShowSettingsMenu(false);
  };

  // .3.4 - Delete account handler
  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session found');
        }

        // Call edge function for complete account deletion
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-account-deletion`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete account');
        }

        // Clear all local data and logout
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();

        // Redirect to login page
        window.location.href = '/login';

      } catch (error) {
        console.error('Error deleting account:', error);
        alert(`Failed to delete account: ${error.message}`);
      }
    }
    setShowSettingsMenu(false);
  };

  // .4 - Return UI
  return (
    <>
      {/* .4.1 - Fixed Top Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'navbar-glass' : 'bg-white/80 backdrop-blur-sm'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* .4.1.1 - Brand & Links */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-2xl font-bold transition-all duration-300 hover:scale-105">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Project
                  </span>
                  <span className="text-gray-800 ml-1">Review Platform</span>
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navLinks.map((link, index) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${location.pathname === link.path
                      ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    style={{
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {link.label}
                    {location.pathname === link.path && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* .4.1.2 - User Profile & Auth Buttons */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className="inline-flex sm:hidden items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Show user info and logout when authenticated */}
              {isAuthenticated && userProfile ? (
                <div className="flex items-center space-x-3">
                  {/* User Profile Info */}
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-800 max-w-[150px] truncate text-right" title={userProfile.full_name || userProfile.name}>
                      {userProfile.full_name || userProfile.name || 'User'}
                    </span>
                    <span className="text-xs text-purple-600 font-medium capitalize bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {activeRole || userProfile.role}
                      {userProfile.roles && userProfile.roles.length > 1 ? ` (${userProfile.roles.length})` : ''}
                    </span>
                  </div>

                  {/* Role Switching UI */}
                  <RoleSwitcher />

                  {/* User Avatar */}
                  <div className="relative group cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-purple-100 shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/25">
                      <FaUser className="text-white text-lg drop-shadow-sm" />
                    </div>
                  </div>

                  {/* Logout Button (Replaces Settings) */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg transition-all duration-300 text-sm font-medium"
                    title="Logout"
                  >
                    <FaSignOutAlt className="mr-2" />
                    Logout
                  </button>

                </div>
              ) : (
                /* Show Login/Signup when not authenticated */
                <div className="flex items-center space-x-2">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors duration-300"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* .4.2 - Mobile Menu */}
        <div className={`sm:hidden px-4 pb-3 pt-2 border-t border-gray-100 bg-white/95 backdrop-blur-sm ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          {/* Mobile User Info */}
          {isAuthenticated && userProfile && (
            <div className="flex items-center space-x-3 px-4 py-3 mb-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {userProfile.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{userProfile.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {activeRole || userProfile.role}
                  {userProfile.roles && userProfile.roles.length > 1 ? ` (${userProfile.roles.length} roles)` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link, index) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${location.pathname === link.path
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Auth Buttons */}
            {!isAuthenticated && (
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full px-4 py-3 text-left rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-all duration-300"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/signup');
                  }}
                  className="w-full px-4 py-3 text-left rounded-lg text-base font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* .4.3 - Spacer to push page content below fixed navbar */}
      <div className="h-16" />
    </>
  );
};

export default Navbar; 