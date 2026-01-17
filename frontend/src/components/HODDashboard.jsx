import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { FaCalendarAlt, FaUser, FaCog, FaTrash, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import RoleSwitcher from './RoleSwitcher';
import Loader from './ui/Loader';
import { SlidingNumberBasic } from './SlidingNumberBasic';
import SingleGlowingCard from './ui/SingleGlowingCard';
import toast from 'react-hot-toast';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const HODDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user, userProfile, isAuthenticated, activeRole, updateActiveRole, updateUserProfile } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projectDetails, setProjectDetails] = useState([]);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0); // Global Count
  const [activeProjectsCount, setActiveProjectsCount] = useState(0); // Global Active Count
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBecomeMenu, setShowBecomeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { selectedYear, isProjectInYear } = useAcademicYear();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (showBecomeMenu && !event.target.closest('.become-menu-container')) {
        setShowBecomeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showBecomeMenu]);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (!selectedYear) return null;

  const fetchData = async () => {
    try {
      // Fetch global statistics (independent of year)
      const [
        { count: totalCount, error: totalCountError },
        { count: activeCount, error: activeCountError }
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'draft')
      ]);

      if (totalCountError) console.error('Error fetching total count:', totalCountError);
      if (activeCountError) console.error('Error fetching active count:', activeCountError);

      setTotalProjectsCount(totalCount || 0);
      setActiveProjectsCount(activeCount || 0);

      // Fetch mentors and mentees in parallel
      const [
        { data: mentorsData, error: mentorsError },
        { data: menteesData, error: menteesError }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, role, is_verified, created_at')
          .or('role.eq.mentor,roles.cs.{"mentor"}'),
        supabase
          .from('users')
          .select('id, full_name, email, role, is_verified, created_at')
          .eq('role', 'mentee')
      ]);

      if (mentorsError) throw mentorsError;
      if (menteesError) throw menteesError;

      setMentors(mentorsData || []);
      setMentees(menteesData || []);

      // Fetch project assignments and hydrate coordinator project data
      const processedAssignments = await fetchAssignments();
      const assignmentMap = new Map(
        (processedAssignments || []).map(assignment => [assignment.project_id, assignment])
      );

      let projectsQuery = supabase
        .from('projects')
        .select(`
          *,
          mentor:users!mentor_id(id, full_name, email, is_verified),
          coordinator:users!assigned_by(id, full_name, email, is_verified)
        `)
        .order('created_at', { ascending: false });

      // Fetch ALL projects for complete overview, ignoring year selection
      // if (selectedYear && selectedYear.name) {
      //   projectsQuery = projectsQuery.contains('visible_sessions', [selectedYear.name]);
      // }

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setProjects([]);
      } else {
        const allMenteeIds = new Set();
        (projectsData || []).forEach(project => {
          if (Array.isArray(project.mentees)) {
            project.mentees.forEach(id => {
              if (id) {
                allMenteeIds.add(id);
              }
            });
          }
        });

        let menteeLookup = new Map();
        if (allMenteeIds.size > 0) {
          const menteeIdArray = Array.from(allMenteeIds);
          const { data: menteeProfiles, error: menteeProfilesError } = await supabase
            .from('users')
            .select('id, full_name, email, is_verified')
            .in('id', menteeIdArray);

          if (menteeProfilesError) {
            console.error('Error fetching mentee profiles:', menteeProfilesError);
          } else if (menteeProfiles) {
            menteeLookup = new Map(
              menteeProfiles.map(profile => [profile.id, profile])
            );
          }
        }

        const enrichedProjects = (projectsData || []).map(project => {
          const menteeProfiles = Array.isArray(project.mentees)
            ? project.mentees
              .map(menteeId => menteeLookup.get(menteeId))
              .filter(Boolean)
              .map(profile => ({
                id: profile.id,
                name: profile.full_name || profile.name || profile.email,
                email: profile.email || '',
                is_verified: profile.is_verified || false
              }))
            : [];

          return {
            ...project,
            mentees: menteeProfiles,
            coordinatorAssignment: assignmentMap.get(project.id) || null
          };
        });

        setProjects(enrichedProjects);
        if (!selectedProject && enrichedProjects.length > 0) {
          setSelectedProject(enrichedProjects[0]);
        }
      }

      // Fetch project team members with project and user details
      const { data: projectTeamData, error: teamError } = await supabase
        .from('project_team_members')
        .select(`
          id,
          role,
          joined_at,
          project:projects!project_id(
            id,
            title,
            domain,
            duration_months,
            mentor:users!mentor_id (
              id,
              full_name,
              email,
              is_verified
            )
          ),
          user:users!user_id (
            id,
            full_name,
            email,
            role,
            is_verified
          )
        `);

      if (teamError) throw teamError;

      setProjectDetails(projectTeamData || []);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      // Fetch PROJECTS for the selected year (or all, and filter later)
      // Join with created_by(users), mentor_id(users)
      let query = supabase
        .from('projects')
        .select(`
          id,
          project_name,
          title,
          description,
          status,
          created_at,
          deadline,
          created_by,
          mentor_id,
          assigned_by,
          mentees,
          visible_sessions,
          coordinator:users!assigned_by(id, full_name, email, is_verified),
          mentor:users!mentor_id(id, full_name, email, is_verified)
        `)
        .order('created_at', { ascending: false });

      if (selectedYear && selectedYear.name) {
        query = query.contains('visible_sessions', [selectedYear.name]);
      }

      const { data: projectsData, error: projectsError } = await query;

      if (projectsError) throw projectsError;

      if (!projectsData) {
        setAssignments([]);
        return [];
      }

      // We need to resolve Mentees for display
      // Collect all Mentee IDs
      const allMenteeIds = new Set();
      projectsData.forEach(p => {
        if (p.mentees && Array.isArray(p.mentees)) {
          p.mentees.forEach(mid => {
            if (typeof mid === 'string') allMenteeIds.add(mid);
          });
        }
      });

      let menteeLookup = new Map();
      if (allMenteeIds.size > 0) {
        const { data: mData } = await supabase
          .from('users')
          .select('id, full_name, email, is_verified')
          .in('id', Array.from(allMenteeIds));

        if (mData) {
          mData.forEach(m => menteeLookup.set(m.id, m));
        }
      }

      // Process assignments
      const processed = projectsData.map(p => {
        const menteeDetails = (p.mentees || [])
          .map(mid => menteeLookup.get(mid))
          .filter(Boolean)
          .map(m => ({
            mentee_name: m.full_name || m.email,
            mentee_email: m.email,
            is_verified: m.is_verified || false
          }));

        return {
          id: p.id,
          project_id: p.id,
          project_name: p.project_name || p.title,
          status: p.status,
          mentor_name: p.mentor?.full_name || p.mentor?.email || p.mentor_email || 'Not Assigned',
          mentor_email: p.mentor?.email,
          coordinator_name: p.coordinator?.full_name || p.coordinator?.email || 'Unknown Coordinator',
          coordinator_id: p.created_by,
          created_at: p.created_at,
          mentees: menteeDetails,
          deadline: p.deadline
        };
      });

      setAssignments(processed);
      return processed;

    } catch (err) {
      console.error('Error fetching assignments:', err);
      // setAssignments([]); // Keep old if fail?
      return [];
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }

    // Set up real-time subscription for project assignments
    const assignmentsChannel = supabase
      .channel('project-coordinator-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'project_assignments'
        },
        (payload) => {
          console.log('Coordinator Assignment change detected:', payload);
          // Refetch dashboard data to update the HOD view
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(assignmentsChannel);
    };
  }, [selectedYear]);

  const switchToRole = (newRole) => {
    if (newRole && newRole !== activeRole) {
      updateActiveRole(newRole);
      const dashboardPaths = {
        mentee: '/components/dashboard/mentee',
        mentor: '/components/dashboard/mentor',
        hod: '/components/dashboard/hod',
        project_coordinator: '/components/dashboard/coordinator',
      };
      const dashboardPath = dashboardPaths[newRole] || dashboardPaths.hod;
      console.log(`Switching to role: ${newRole}, navigating to: ${dashboardPath}`);

      // Force a small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate(dashboardPath, { replace: true });
      }, 100);
    }
  };

  const assignRoleToUser = async (newRole) => {
    try {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Check if user already has this role
      if (userProfile?.roles && userProfile.roles.includes(newRole)) {
        // If user already has the role, just switch to it
        switchToRole(newRole);
        return;
      }

      // Add the new role to the user's roles array
      const updatedRoles = userProfile?.roles
        ? [...userProfile.roles, newRole]
        : [newRole];

      // Update the user's roles in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          roles: updatedRoles,
          updated_at: new Date()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user roles:', updateError);
        throw new Error('Failed to update user roles in database');
      }

      // Update the local user profile with the new roles
      const updatedProfile = {
        ...userProfile,
        roles: updatedRoles
      };

      updateUserProfile(updatedProfile);

      // Switch to the new role
      toast.success(`Role updated! Switching to ${newRole}...`);
      switchToRole(newRole);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
      setError('Failed to assign role. Please try again.');
      // Hide error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBecomeRole = async (role) => {
    setShowBecomeMenu(false);
    await assignRoleToUser(role);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
    // Here you can implement actual theme switching logic
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setShowUserMenu(false);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      try {
        const userId = user.id;
        const userEmail = user.email;

        // Delete all user-related data from all tables in correct order to avoid foreign key constraints

        // 1. Delete project files from storage
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .or(`created_by.eq.${userId}, mentor_id.eq.${userId}`);

        if (projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);

          // Delete files from storage for each project
          for (const projectId of projectIds) {
            const { data: files } = await supabase
              .from('project_files')
              .select('storage_path')
              .eq('project_id', projectId);

            if (files && files.length > 0) {
              const filePaths = files
                .map(f => f.storage_path)
                .filter(path => path);

              if (filePaths.length > 0) {
                await supabase.storage
                  .from('project-files')
                  .remove(filePaths);
              }
            }
          }

          // Delete project files records
          await supabase
            .from('project_files')
            .delete()
            .in('project_id', projectIds);

          // Delete project deliverables
          await supabase
            .from('project_deliverables')
            .delete()
            .in('project_id', projectIds);

          // Delete submissions
          await supabase
            .from('submissions')
            .delete()
            .in('project_id', projectIds);

          // Delete project team members
          await supabase
            .from('project_team_members')
            .delete()
            .in('project_id', projectIds);

          // Delete project assignments and mentees
          const { data: assignments } = await supabase
            .from('project_assignments')
            .select('id')
            .in('project_id', projectIds);

          if (assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);

            await supabase
              .from('project_assignment_mentees')
              .delete()
              .in('assignment_id', assignmentIds);

            await supabase
              .from('project_assignments')
              .delete()
              .in('project_id', projectIds);
          }
        }

        // 2. Delete projects created by or assigned to user
        await supabase
          .from('projects')
          .delete()
          .or(`created_by.eq.${userId}, mentor_id.eq.${userId}`);

        // 3. Delete user from mentees arrays in projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, mentees');

        if (allProjects && allProjects.length > 0) {
          for (const project of allProjects) {
            if (project.mentees && Array.isArray(project.mentees)) {
              const updatedMentees = project.mentees.filter(mentee =>
                mentee !== userId && mentee !== userEmail
              );

              if (updatedMentees.length !== project.mentees.length) {
                await supabase
                  .from('projects')
                  .update({ mentees: updatedMentees })
                  .eq('id', project.id);
              }
            }
          }
        }

        // 4. Delete user profile from users table
        await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        // 5. Delete user from authentication using admin function
        const { error: authError } = await supabase.rpc('admin_delete_user', {
          user_id: userId
        });

        if (authError) {
          console.warn('Admin delete failed, signing out:', authError);
        }

        // Clear all local storage data
        localStorage.clear();
        sessionStorage.clear();

        toast.success('Account and all associated data deleted successfully');

        // Force logout and redirect
        await signOut();
        navigate('/');

      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error('Failed to delete account. Please contact support or try again.');
      }
    }
    setShowUserMenu(false);
  };

  const handleViewProjectDetails = (project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  // Server-side filtering is now authoritative. Client-side filter can be relaxed or removed.
  // We keep the arrays as-is because they are already filtered by the query.
  const filteredProjects = projects;
  const filteredAssignments = assignments;

  const resolveMentor = (project) => {
    if (!project) return { name: 'Not assigned', email: '', is_verified: false };
    const name = project.mentor?.full_name || project.mentor?.name || project.coordinatorAssignment?.mentor_name || 'Not assigned';
    const email = project.mentor?.email || project.coordinatorAssignment?.mentor_email || '';
    const is_verified = project.mentor?.is_verified || false;
    return { name, email, is_verified };
  };

  const formatStatus = (status) => {
    if (!status) return 'Active';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    if (status === 'draft') return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const resolveMentees = (project) => {
    if (!project) return [];
    const joinMentees = Array.isArray(project.mentees)
      ? project.mentees
        .map(entry => {
          if (!entry) return null;
          return {
            name: entry.name || entry.full_name || entry.email,
            email: entry.email || '',
            is_verified: entry.is_verified || false
          };
        })
        .filter(Boolean)
      : [];

    const assignmentMentees = Array.isArray(project.coordinatorAssignment?.mentees)
      ? project.coordinatorAssignment.mentees.map(entry => ({
        name: entry.mentee_name || entry.mentee_email,
        email: entry.mentee_email || '',
        is_verified: entry.is_verified || false
      }))
      : [];

    const combined = [...joinMentees];
    assignmentMentees.forEach(entry => {
      const email = (entry.email || '').toLowerCase();
      if (!combined.some(existing => (existing.email || '').toLowerCase() === email && email)) {
        combined.push(entry);
      }
    });
    return combined;
  };



  // Authentication check
  // Check if user has access to hod dashboard (either as primary role or in roles array)
  // Also check if this is their active role
  const hasHodAccess = userProfile?.role === 'hod' ||
    (userProfile?.roles && userProfile.roles.includes('hod'));

  const isActiveRoleHod = (activeRole || userProfile?.role) === 'hod';

  if (!isAuthenticated || !user || !userProfile || !hasHodAccess || !isActiveRoleHod) {
    // Redirect to appropriate dashboard based on active role
    if (userProfile) {
      const currentActiveRole = activeRole || userProfile.role;
      let redirectPath = '/';

      switch (currentActiveRole) {
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

      // Only redirect if we're not already on the correct path
      if (window.location.pathname !== redirectPath) {
        return (
          <Loader />
        );
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Only HOD can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-6" style={{ overflow: 'visible' }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HOD Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Manage all projects, mentors, mentees, and assignments.
          </p>
          {selectedYear && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
              <FaCalendarAlt className="mr-2" />
              Academic Year: {selectedYear.name}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3" style={{ overflow: 'visible', flexShrink: 0 }}>
          {/* Become button with dropdown - Show if user is missing either mentor or coordinator role */}
          {(!userProfile?.roles?.includes('mentor') || !userProfile?.roles?.includes('project_coordinator')) && (
            <div className="relative become-menu-container">
              <button
                onClick={() => setShowBecomeMenu(!showBecomeMenu)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Become
              </button>

              {showBecomeMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                  <button
                    onClick={() => handleBecomeRole('mentor')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Become a Mentor
                  </button>
                  <button
                    onClick={() => handleBecomeRole('project_coordinator')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Become a Coordinator
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700">Total Mentors</h3>
              <div className="text-3xl font-bold text-blue-600">
                <SlidingNumberBasic target={mentors.length} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700">Total Mentees</h3>
              <div className="text-3xl font-bold text-green-600">
                <SlidingNumberBasic target={mentees.length} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700">Total Projects</h3>
              <div className="text-3xl font-bold text-purple-600">
                <SlidingNumberBasic target={totalProjectsCount} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700">Active Projects</h3>
              <div className="text-3xl font-bold text-orange-600">
                <SlidingNumberBasic target={activeProjectsCount} />
              </div>
            </div>
            <SingleGlowingCard glowColor="#3b82f6" glowRadius={120} glowOpacity={0.9}>
              <div className="bg-white p-6 rounded-lg shadow h-full">
                <h3 className="text-lg font-semibold text-gray-700">Feature Coming Soon</h3>

              </div>
            </SingleGlowingCard>
          </>
        )}
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mentors */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Mentors ({mentors.length})</h2>
          <div className="max-h-64 overflow-y-auto">
            {mentors.length === 0 ? (
              <p className="text-gray-500">No mentors found.</p>
            ) : (
              <div className="space-y-2">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-800">{mentor.full_name || mentor.name}</p>
                      <p className="text-sm text-gray-600">{mentor.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateDDMMYYYY(mentor.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mentees */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Mentees ({mentees.length})</h2>
          <div className="max-h-64 overflow-y-auto">
            {mentees.length === 0 ? (
              <p className="text-gray-500">No mentees found.</p>
            ) : (
              <div className="space-y-2">
                {mentees.map((mentee) => (
                  <div key={mentee.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-800">{mentee.full_name || mentee.name}</p>
                      <p className="text-sm text-gray-600">{mentee.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateDDMMYYYY(mentee.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">All Projects - Complete Overview</h2>
        <p className="text-gray-600 mb-4">
          View all projects (both mentee-created and coordinator-assigned)
        </p>
        {filteredProjects.length === 0 ? (
          <p className="text-gray-500">No projects found for this academic year.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Project Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Mentor</th>
                  <th className="px-4 py-2 text-left">Duration</th>
                  <th className="px-4 py-2 text-left">Status/Details</th>
                  <th className="px-4 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-blue-600">
                      <button
                        type="button"
                        onClick={() => setSelectedProject(project)}
                        className="text-left w-full hover:underline"
                      >
                        {project.project_name || project.title || 'Untitled Project'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.assigned_by || project.coordinatorAssignment ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {project.assigned_by || project.coordinatorAssignment ? 'Coordinator Assigned' : 'Mentee Created'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {project.mentor ? (
                        <div>
                          <p className="font-medium text-purple-700">
                            {project.mentor.full_name || project.mentor.name || project.mentor.email}
                          </p>
                          <p className="text-sm text-gray-600">
                            {project.mentor.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">No mentor</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {project.duration_months || (project.deadline ? Math.round((new Date(project.deadline) - new Date(project.created_at || Date.now())) / (1000 * 60 * 60 * 24 * 30.44)) : 12)} months
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {project.assigned_by || project.coordinatorAssignment ? (
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-[10px] w-fit font-medium ${project.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : project.status === 'draft'
                                ? 'bg-gray-100 text-gray-800' // Drafts are gray now
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                            {project.status === 'draft' ? 'Coordinator Assigned' : formatStatus(project.status || 'Assigned')}
                          </span>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {project.project_details || 'No details provided'}
                          </p>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isProjectDraft(project)
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : (project.status === 'in_progress' || project.status === 'active' || project.status === 'draft')
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {isProjectDraft(project) ? '⚠️ Draft' : (project.status === 'draft' ? 'Active' : formatStatus(project.status || 'Active'))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatDateDDMMYYYY(project.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {
        selectedProject && (
          <div id="project-details-section" className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Project Details</h2>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900">Name</p>
                <p>{selectedProject.project_name || selectedProject.title || 'Untitled Project'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Description</p>
                <p>{selectedProject.project_details || selectedProject.description || 'No details provided'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Mentor</p>
                {(() => {
                  const mentor = resolveMentor(selectedProject);
                  return (
                    <p>{mentor.name}{mentor.email ? ` (${mentor.email})` : ''}</p>
                  );
                })()}
              </div>
              <div>
                <p className="font-medium text-gray-900">Mentees</p>
                {resolveMentees(selectedProject).length === 0 ? (
                  <p>No mentees</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {resolveMentees(selectedProject).map((mentee, index) => (
                      <li key={index}>{mentee.name}{mentee.email ? ` (${mentee.email})` : ''}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Duration</p>
                <p>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                    {selectedProject.duration_months || (selectedProject.deadline ? Math.round((new Date(selectedProject.deadline) - new Date(selectedProject.created_at || Date.now())) / (1000 * 60 * 60 * 24 * 30.44)) : 12)} months
                  </span>
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* Coordinator Assignments Section (Grouped by Coordinator) */}
      <div className="bg-white p-6 rounded-lg shadow mt-8">
        <h2 className="text-xl font-semibold mb-4">Coordinator Assignments Year {selectedYear?.name}</h2>
        <p className="text-gray-600 mb-6">
          Projects assigned by coordinators for AY {selectedYear?.name}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              // 1. Filter for coordinator projects within the selected year
              const coordinatorProjects = filteredProjects.filter(project =>
                project.coordinatorAssignment &&
                project.visible_sessions &&
                project.visible_sessions.includes(selectedYear?.name)
              );

              if (coordinatorProjects.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-8">
                    No coordinator assignments found for this academic year.
                  </p>
                );
              }

              // 2. Group by Coordinator
              const projectsByCoordinator = {};
              filteredProjects.forEach(project => {
                // Use created_by (Coordinator ID) for grouping
                const coordId = project.created_by;
                if (!coordId) return;

                if (!projectsByCoordinator[coordId]) {
                  projectsByCoordinator[coordId] = [];
                }
                projectsByCoordinator[coordId].push(project);
              });

              return Object.keys(projectsByCoordinator).map(coordId => {
                const projects = projectsByCoordinator[coordId];
                // Try to find coordinator name from the joined data
                const firstProject = projects[0];
                const coordinatorName = firstProject?.coordinator?.full_name ||
                  firstProject?.coordinator?.email ||
                  "Project Coordinator";

                return (
                  <div key={coordId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold">C</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {coordinatorName}
                        </h3>
                        <span className="text-sm text-gray-500">{projects.length} assignments</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map((project) => (
                        <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 line-clamp-1" title={project.project_name || project.title}>
                              {project.project_name || project.title || 'Untitled'}
                            </h4>
                            <span className={`text-[10px] px-2 py-1 rounded-full ${project.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : project.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {project.status === 'draft' ? 'Coordinator Assigned' : formatStatus(project.status || 'Active')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                            {project.project_details || project.description}
                          </p>

                          <div className="flex items-center justify-between text-xs text-gray-600 mt-auto">
                            <div className="flex items-center" title="Mentor">
                              <FaUser className="mr-1 text-gray-400" />
                              <span className="truncate max-w-[100px]">
                                {project.mentor?.name || project.mentor?.full_name || 'No Mentor'}
                              </span>
                            </div>
                            <div className="flex items-center" title="Mentees">
                              <span className="bg-gray-100 px-2 py-0.5 rounded">
                                {project.mentees?.length || 0} mentees
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewProjectDetails(project)}
                            className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-black/5 transition-opacity rounded-lg"
                            title="View Details"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });

            })()}
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {
        showProjectModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedProject.project_name || selectedProject.title || 'Untitled Project'}
                    </h2>
                    <div className="flex items-center space-x-3">
                      {!selectedProject.assigned_by && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          Mentee Created
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedProject.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : selectedProject.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {selectedProject.status === 'draft' ? 'Coordinator Assigned' : formatStatus(selectedProject.status || 'Active')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={closeProjectModal}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Project Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedProject.project_details || selectedProject.description || 'No description provided'}
                  </p>
                </div>

                {/* Project Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">
                          {selectedProject.duration_months || (selectedProject.deadline ? Math.round((new Date(selectedProject.deadline) - new Date(selectedProject.created_at || Date.now())) / (1000 * 60 * 60 * 24 * 30.44)) : 12)} months
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {formatDateDDMMYYYY(selectedProject.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Domain:</span>
                        <span className="font-medium">{selectedProject.domain || 'Not specified'}</span>
                      </div>
                      {selectedProject.assigned_by && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assigned By:</span>
                          <span className="font-medium text-green-600">Coordinator</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Year</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-blue-600 mr-3" />
                        <div>
                          <div className="font-medium">
                            {(() => {
                              const projectDate = new Date(selectedProject.created_at);
                              const year = projectDate.getFullYear();
                              return `${year}-${year + 1}`;
                            })()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDateDDMMYYYY(selectedProject.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mentor Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Mentor Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      const mentor = resolveMentor(selectedProject);
                      return (
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-purple-600 font-bold text-lg">
                              {mentor.name ? mentor.name.charAt(0).toUpperCase() : 'M'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{mentor.name}</p>
                              {mentor.is_verified && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-bold">VERIFIED</span>
                              )}
                            </div>
                            <p className="text-gray-600">{mentor.email}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Mentees Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Mentees ({resolveMentees(selectedProject).length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resolveMentees(selectedProject).length === 0 ? (
                      <p className="text-gray-500 col-span-2">No mentees assigned to this project.</p>
                    ) : (
                      resolveMentees(selectedProject).map((mentee, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold text-sm">
                              {mentee.name ? mentee.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{mentee.name}</p>
                              {mentee.is_verified && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-bold">VERIFIED</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{mentee.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                {selectedProject.technologies && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Technologies</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.technologies.split(',').map((tech, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedProject.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-gray-700">{selectedProject.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 pt-4">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeProjectModal}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProject(selectedProject);
                      setShowProjectModal(false);
                      // Scroll to the existing project details section
                      const detailsSection = document.getElementById('project-details-section');
                      if (detailsSection) {
                        detailsSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    View in Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default HODDashboard;
