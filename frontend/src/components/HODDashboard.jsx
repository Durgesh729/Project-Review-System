import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { FaCalendarAlt } from 'react-icons/fa';
import RoleSwitcher from './RoleSwitcher';
import Loader from './ui/Loader';
import { SlidingNumberBasic } from './SlidingNumberBasic';
import SingleGlowingCard from './ui/SingleGlowingCard';

const HodDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user, userProfile, isAuthenticated, activeRole, updateActiveRole, updateUserProfile } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projectDetails, setProjectDetails] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBecomeMenu, setShowBecomeMenu] = useState(false);
  const { selectedYear, isProjectInYear } = useAcademicYear();

  if (!selectedYear) return null;

  const fetchData = async () => {
    try {
      // Fetch mentors and mentees in parallel
      const [
        { data: mentorsData, error: mentorsError },
        { data: menteesData, error: menteesError }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('role', 'mentor'),
        supabase
          .from('users')
          .select('id, name, email, role, created_at')
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

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          mentor:users!projects_mentor_id_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false });

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
            .select('id, name, email')
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
                name: profile.name || profile.email,
                email: profile.email || ''
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
          role_in_project,
          joined_at,
          project:project_id (
            id,
            title,
            domain,
            mentor:mentor_id (
              id,
              name,
              email
            )
          ),
          user:user_id (
            id,
            name,
            email,
            role
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
      // 1. Fetch assignments first (no join)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`
          id,
          id,
          status,
          notes,
          created_at,
          updated_at,
          project_id,
          project_name,
          mentor_id,
          mentor_name,
          mentor_email,
          created_by
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return [];
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return [];
      }

      // 2. Fetch mentees for these assignments separately
      const assignmentIds = assignmentsData.map(a => a.id);
      const { data: menteesData, error: menteesError } = await supabase
        .from('project_assignment_mentees')
        .select('*')
        .in('assignment_id', assignmentIds);

      if (menteesError) {
        console.error('Error fetching assignment mentees:', menteesError);
        // Continue but with empty mentees
      }

      // 3. Group mentees by assignment_id
      const menteesByAssignment = {};
      (menteesData || []).forEach(m => {
        if (!menteesByAssignment[m.assignment_id]) {
          menteesByAssignment[m.assignment_id] = [];
        }
        menteesByAssignment[m.assignment_id].push(m);
      });

      // 4. Merge
      const processedAssignments = assignmentsData.map(assignment => ({
        ...assignment,
        project_name: assignment.project_name || 'Unknown Project',
        mentor_name: assignment.mentor_name || 'Unknown Mentor',
        coordinator_name: 'Project Coordinator',
        mentees: menteesByAssignment[assignment.id] || []
      }));

      setAssignments(processedAssignments);
      return processedAssignments;
    } catch (err) {
      console.error('Unexpected error fetching assignments:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchData();

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
  }, []);

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
      switchToRole(newRole);
    } catch (error) {
      console.error('Error assigning role:', error);
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

  const filteredProjects = projects.filter(p => isProjectInYear(p));

  const filteredAssignments = assignments.filter(assignment => {
    if (!selectedYear) return true;
    const assignedDate = new Date(assignment.assigned_at);
    const yearStart = new Date(selectedYear.start_date);
    const yearEnd = new Date(selectedYear.end_date);
    return assignedDate >= yearStart && assignedDate <= yearEnd;
  });

  const resolveMentor = (project) => {
    if (!project) return { name: 'Not assigned', email: '' };
    const name = project.mentor?.name || project.coordinatorAssignment?.mentor_name || 'Not assigned';
    const email = project.mentor?.email || project.coordinatorAssignment?.mentor_email || '';
    return { name, email };
  };

  const resolveMentees = (project) => {
    if (!project) return [];
    const joinMentees = Array.isArray(project.mentees)
      ? project.mentees
        .map(entry => {
          if (!entry) return null;
          if (entry.users) {
            return {
              name: entry.users.name || entry.users.email,
              email: entry.users.email || ''
            };
          }
          return {
            name: entry.name || entry.email,
            email: entry.email || ''
          };
        })
        .filter(Boolean)
      : [];

    const assignmentMentees = Array.isArray(project.coordinatorAssignment?.mentees)
      ? project.coordinatorAssignment.mentees.map(entry => ({
        name: entry.mentee_name || entry.mentee_email,
        email: entry.mentee_email || ''
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
      <div className="flex justify-between items-center mb-6">
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
        <div className="flex items-center space-x-3">
          {/* Role Switching Dropdown */}
          <RoleSwitcher />

          {/* Become button with dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBecomeMenu(!showBecomeMenu)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Become
            </button>

            {showBecomeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
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

          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            onClick={handleLogout}
          >
            Logout
          </button>
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
                <SlidingNumberBasic target={filteredProjects.filter(p => p.assigned_by).length} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700">Active Projects</h3>
              <div className="text-3xl font-bold text-orange-600">
                <SlidingNumberBasic target={filteredProjects.filter(p => p.status === 'active').length} />
              </div>
            </div>
            <SingleGlowingCard glowColor="#3b82f6" glowRadius={120} glowOpacity={0.9}>
              <div className="bg-white p-6 rounded-lg shadow h-full">
                <h3 className="text-lg font-semibold text-gray-700">Feature Coming Soon</h3>
                <div className="text-3xl font-bold text-indigo-600">
                  <SlidingNumberBasic target={filteredAssignments.length} />
                </div>
              </div>
            </SingleGlowingCard>
          </>
        )}
      </div>

      {/* Project Assignments Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Project Assignments</h2>
        <p className="text-gray-600 mb-4">
          View all project assignments created by coordinators with mentors and mentees
        </p>
        {filteredAssignments.length === 0 ? (
          <p className="text-gray-500">No project assignments found for this academic year.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{assignment.project_name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${assignment.status === 'approved' ? 'bg-green-100 text-green-800' :
                    assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {assignment.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">👨‍🏫</span>
                    <span className="font-medium">{assignment.mentor_name}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">👥</span>
                    <span>{assignment.mentees.length} mentees: {assignment.mentees.map(m => m.mentee_name).join(', ')}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">👨‍💼</span>
                    <span>Coordinator: {assignment.coordinator_name}</span>
                  </div>

                  {assignment.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="text-gray-600">{assignment.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Created: {new Date(assignment.assigned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                      <p className="font-medium text-gray-800">{mentor.name}</p>
                      <p className="text-sm text-gray-600">{mentor.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(mentor.created_at).toLocaleDateString()}
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
                      <p className="font-medium text-gray-800">{mentee.name}</p>
                      <p className="text-sm text-gray-600">{mentee.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(mentee.created_at).toLocaleDateString()}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.assigned_by ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {project.assigned_by ? 'Coordinator Assigned' : 'Mentee Created'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {project.mentor || project.mentor_id ? (
                        <div>
                          <p className="font-medium text-purple-700">
                            {project.mentor?.name || 'Mentor'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {project.mentor?.email || project.mentor_email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">No mentor</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {project.duration_months || 12} months
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {project.assigned_by ? (
                        <div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {project.project_details || 'No details provided'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {project.mentees && project.mentees.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {project.mentees.length} mentees
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {project.status || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProject && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
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
                  {selectedProject.duration_months || 12} months
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Assigned Projects */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">All Coordinator-Assigned Projects</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-gray-500">No projects assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Project Name</th>
                  <th className="px-4 py-2 text-left">Project Details</th>
                  <th className="px-4 py-2 text-left">Mentor</th>
                  <th className="px-4 py-2 text-left">Mentees</th>
                  <th className="px-4 py-2 text-left">Assigned By</th>
                  <th className="px-4 py-2 text-left">Assigned Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-blue-600">{project.project_name}</td>
                    <td className="px-4 py-2">
                      <p className="text-sm text-gray-600 line-clamp-2">{project.project_details}</p>
                    </td>
                    <td className="px-4 py-2">
                      <div>
                        <p className="font-medium text-purple-700">{project.mentor?.name || 'Not found'}</p>
                        <p className="text-sm text-gray-600">{project.mentor_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {project.mentees && project.mentees.length > 0 ? (
                          project.mentees.map((mentee, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {mentee.name || 'Unknown'}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">No mentees</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Coordinator
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodDashboard;
