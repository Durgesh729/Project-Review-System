import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { FaPlus, FaUsers, FaProjectDiagram, FaExclamationTriangle, FaCheckCircle, FaTrash, FaFileCsv, FaCalendarAlt } from 'react-icons/fa';
import CSVImportSimplified from './CSVImportSimplified';
import RoleSwitcher from './RoleSwitcher';
import Loader from './ui/Loader';

const ProjectCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const { signOut, userProfile: authUserProfile, activeRole, updateActiveRole, updateUserProfile } = useAuth();
  const { selectedYear, isProjectInYear } = useAcademicYear();

  if (!selectedYear) return null;

  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showBecomeMenu, setShowBecomeMenu] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [duration, setDuration] = useState('1 Semester');
  const [menteeName, setMenteeName] = useState('');
  const [menteeEmail, setMenteeEmail] = useState('');

  // Data fetching and Auth Check
  const fetchProjects = async (userId) => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('assigned_by', userId)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        return;
      }

      // Enrich projects with Mentor and Mentee details
      const enrichedProjects = await Promise.all(projectsData.map(async (project) => {
        // Resolve Mentor
        let mentorDisplayName = project.mentor_email; // Default
        let mentorContactEmail = project.mentor_email;

        if (project.mentor_id) {
          const { data: mentorData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', project.mentor_id)
            .single();
          if (mentorData) {
            mentorDisplayName = mentorData.name;
            mentorContactEmail = mentorData.email;
          }
        }

        // Resolve Mentees
        let menteeProfiles = [];
        if (project.mentees && project.mentees.length > 0) {
          // mentees is an array of UUIDs
          const { data: menteesData } = await supabase
            .from('users')
            .select('name, email')
            .in('id', project.mentees);

          if (menteesData) {
            menteeProfiles = menteesData;
          }
        }

        return {
          ...project,
          mentorDisplayName,
          mentorContactEmail,
          menteeProfiles
        };
      }));

      setProjects(enrichedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load project assignments.');
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          // Render will handle redirect msg
          return;
        }

        setUser(user);

        // We use authUserProfile from context, but if missing, fetch it
        let currentProfile = authUserProfile;
        if (!currentProfile) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          currentProfile = profile;
          if (profile) setUserProfile(profile);
        } else {
          setUserProfile(authUserProfile);
        }

        if (currentProfile) {
          await fetchProjects(currentProfile.id);
        }

      } catch (err) {
        console.error('Dashboard init error:', err);
        setError('Failed to initialize dashboard.');
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [authUserProfile]);

  const handleSubmitAssignment = async () => {
    const trimmedProjectName = projectName.trim();
    const trimmedDetails = projectDetails.trim();
    const trimmedMentorName = mentorName.trim();
    const trimmedMentorEmail = mentorEmail.trim().toLowerCase();
    const trimmedMenteeName = menteeName.trim();
    const trimmedMenteeEmail = menteeEmail.trim().toLowerCase();

    if (!trimmedProjectName || !trimmedDetails || !trimmedMentorName || !trimmedMentorEmail || !trimmedMenteeEmail) {
      setError('Please complete all required fields before assigning the project');
      return;
    }

    const normalizedDurationMap = {
      '1 Semester': 6,
      '2 Semesters': 12,
      '3 Semesters': 18,
      '4 Semesters': 24
    };

    const durationMonths = normalizedDurationMap[duration] || 12;

    if (!duration) {
      setError('Please select a valid project duration');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedMentorEmail)) {
      setError('Please enter a valid mentor email address');
      return;
    }

    if (!emailRegex.test(trimmedMenteeEmail)) {
      setError('Please enter a valid mentee email address');
      return;
    }

    if (!userProfile?.id) {
      setError('Unable to determine the current coordinator. Please refresh and try again.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Check for existing assignment via users table only (simplified)
      const { data: mentorProfile, error: mentorLookupError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', trimmedMentorEmail)
        .maybeSingle();

      if (mentorLookupError) {
        console.error('Error looking up mentor:', mentorLookupError);
        setError('Failed to verify mentor. Please try again later.');
        return;
      }

      const { data: menteeProfile, error: menteeLookupError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', trimmedMenteeEmail)
        .maybeSingle();

      if (menteeLookupError) {
        console.error('Error looking up mentee:', menteeLookupError);
        setError('Failed to verify mentee. Please try again later.');
        return;
      }

      // Check if mentee is already assigned? (Optional enhancement if strictly 1 project per mentee ever, but user said 1:1 per project)
      // For now, proceed.

      const menteeData = {
        id: menteeProfile?.id || null,
        name: trimmedMenteeName || menteeProfile?.name || trimmedMenteeEmail.split('@')[0],
        email: trimmedMenteeEmail,
        isExisting: !!menteeProfile
      };

      const existingMenteeIds = menteeData.id ? [menteeData.id] : [];

      const mentorDisplayName = mentorProfile?.name
        ? mentorProfile.name
        : trimmedMentorName;

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_name: trimmedProjectName,
          project_details: trimmedDetails,
          mentor_id: mentorProfile?.id || null,
          mentor_email: trimmedMentorEmail,
          mentees: existingMenteeIds, // Still an array, but strictly one element
          assigned_by: userProfile.id,
          duration_months: durationMonths
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from('project_assignments')
        .insert({
          project_id: project.id,
          project_name: trimmedProjectName,
          mentor_id: mentorProfile?.id || null,
          mentor_name: mentorDisplayName,
          mentor_email: trimmedMentorEmail,
          created_by: userProfile.id,
          status: 'pending',
          duration: duration,
          duration_months: durationMonths
        })
        .select()
        .maybeSingle();

      if (assignmentError) {
        console.error('Error creating project assignment record:', assignmentError);
      }

      if (assignment?.id) {
        const { error: menteeAssignmentError } = await supabase
          .from('project_assignment_mentees')
          .insert({
            assignment_id: assignment.id,
            mentee_id: menteeData.id || null, // Allow null if account doesn't exist yet
            mentee_name: menteeData.name,
            mentee_email: menteeData.email
          });

        if (menteeAssignmentError) {
          console.error('Error storing mentee assignment:', menteeAssignmentError);
        }
      }

      await fetchProjects(userProfile.id);

      setProjectName('');
      setProjectDetails('');
      setMentorName('');
      setMentorEmail('');
      setMenteeName('');
      setMenteeEmail('');

      setSuccess(
        !menteeData.id
          ? `Project assigned. Pending mentee account: ${menteeData.email}`
          : 'Project assigned successfully!'
      );

      console.log('Project assigned successfully');

    } catch (error) {
      console.error('Error creating project assignment:', error);
      setError(`Failed to assign project: ${error.message}`);
    }
  };

  const handleCSVImportComplete = async (importResults) => {
    try {
      // Refresh projects list
      await fetchProjects(userProfile.id);

      // Show success message
      if (importResults.success > 0) {
        setSuccess(`Successfully imported ${importResults.success} projects from CSV!`);
        setShowCSVImport(false);
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error refreshing after CSV import:', error);
    }
  };

  const switchToRole = (newRole) => {
    if (newRole && newRole !== activeRole) {
      updateActiveRole(newRole);
      const dashboardPaths = {
        mentee: '/components/dashboard/mentee',
        mentor: '/components/dashboard/mentor',
        hod: '/components/dashboard/hod',
        project_coordinator: '/components/dashboard/coordinator',
      };
      const dashboardPath = dashboardPaths[newRole] || dashboardPaths.project_coordinator;
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
      if (authUserProfile?.roles && authUserProfile.roles.includes(newRole)) {
        // If user already has the role, just switch to it
        switchToRole(newRole);
        return;
      }

      // Add the new role to the user's roles array
      const updatedRoles = authUserProfile?.roles
        ? [...authUserProfile.roles, newRole]
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
        ...authUserProfile,
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

  if (loading) {
    return (
      <Loader />
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Coordinator Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userProfile.name}</p>
              {selectedYear && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                  <FaCalendarAlt className="mr-2" />
                  Academic Year: {selectedYear.name}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCSVImport(!showCSVImport)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FaFileCsv /> {showCSVImport ? 'Hide CSV Import' : 'Import CSV'}
              </button>

              <RoleSwitcher />

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
                      onClick={() => handleBecomeRole('hod')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Become a HOD
                    </button>
                    <button
                      onClick={() => handleBecomeRole('mentor')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Become a Mentor
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaCheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-green-700">{success}</p>
                <button
                  onClick={() => setSuccess(null)}
                  className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CSV Import Section */}
        {showCSVImport && (
          <div className="mb-8">
            <CSVImportSimplified
              onImportComplete={handleCSVImportComplete}
              coordinatorId={userProfile?.id}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign New Project</h2>

            {/* Project Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Project Details */}
            <div className="space-y-2">
              <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-700">Project Details</label>
              <textarea
                id="projectDetails"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter details..."
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2 mt-4">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Project Duration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="1 Semester">1 Semester (6 months)</option>
                <option value="2 Semesters">2 Semesters (12 months)</option>
                <option value="3 Semesters">3 Semesters (1.5 years)</option>
                <option value="4 Semesters">4 Semesters (2 years)</option>
              </select>
            </div>

            {/* Mentor Details */}
            <div className="mb-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentor Name *
              </label>
              <input
                type="text"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                placeholder="Enter mentor's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentor Email *
              </label>
              <input
                type="email"
                value={mentorEmail}
                onChange={(e) => setMentorEmail(e.target.value)}
                placeholder="mentor@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mentee Details */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentee Name *
              </label>
              <input
                type="text"
                value={menteeName}
                onChange={(e) => setMenteeName(e.target.value)}
                placeholder="Enter mentee's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentee Email *
              </label>
              <input
                type="email"
                value={menteeEmail}
                onChange={(e) => setMenteeEmail(e.target.value)}
                placeholder="mentee@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitAssignment}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2" />
              Assign Project
            </button>
          </div>

          {/* Assigned Projects */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Assigned Projects</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {!projects || projects.filter(p => isProjectInYear(p)).length === 0 ? (
                <div className="text-center py-8">
                  <FaProjectDiagram className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-sm">No projects assigned in this academic year</p>
                </div>
              ) : (
                projects
                  .filter(project => isProjectInYear(project))
                  .map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{project.project_name}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.project_details}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                            <span className="flex items-center">
                              <FaUsers className="mr-1" />
                              Mentor: {project.mentorDisplayName || project.mentorContactEmail || 'Not found'}
                            </span>
                            <span>Mentees: {(project.menteeProfiles?.length ?? project.mentees?.length) || 0}</span>
                            <span className="ml-4">Duration: {project.duration_months || 12} months</span>
                          </div>
                        </div>
                      </div>

                      {project.menteeProfiles && project.menteeProfiles.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Assigned Mentees:</p>
                          <div className="flex flex-wrap gap-2">
                            {project.menteeProfiles.map((mentee, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                              >
                                {mentee.name || mentee.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Assigned: {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectCoordinatorDashboard;
