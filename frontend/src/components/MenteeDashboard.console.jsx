import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { FaUpload, FaEye, FaTrash, FaFileAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaDownload } from 'react-icons/fa';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

// Define the storage bucket constant
const STORAGE_BUCKET = 'submissions';

const MenteeDashboard = () => {
  const { signOut, userProfile: authUserProfile, activeRole, updateActiveRole } = useAuth();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  // Add missing state variables
  const [submissions, setSubmissions] = useState({});
  const [uploading, setUploading] = useState({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const navigate = useNavigate();

  // Submission stages configuration (matching MentorDashboard)
  const submissionStages = [
    { key: "ideaPresentation", label: "Idea Presentation", allowedTypes: ["pdf"], icon: "📄" },
    { key: "progress1", label: "Progress 1", allowedTypes: ["pdf", "docx"], icon: "📊" },
    { key: "progress2", label: "Progress 2", allowedTypes: ["pdf"], icon: "📈" },
    { key: "progress3", label: "Progress 3", allowedTypes: ["ppt", "pdf"], icon: "🎯" },
    { key: "progress4", label: "Progress 4", allowedTypes: ["ppt", "pdf"], icon: "🚀" },
    { key: "phase1", label: "Phase 1 Report", allowedTypes: ["pdf"], icon: "📋" },
    { key: "finalReport", label: "Final Report", allowedTypes: ["pdf"], icon: "📋" },
    { key: "finalDemo", label: "Final Demo", allowedTypes: ["mp4", "mkv"], icon: "🎥" },
    { key: "finalPpt", label: "Final PPT", allowedTypes: ["pdf"], icon: "📊" },
    { key: "codebook", label: "Codebook", allowedTypes: ["docx", "pdf"], icon: "📚" },
    { key: "achievements", label: "Achievements", allowedTypes: ["pdf", "txt", "docx"], icon: "🏆" },
    { key: "feedbackForm", label: "Feedback Form", allowedTypes: [], isForm: true, icon: "💬" }
  ];

  useEffect(() => {
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (user && userProfile?.role === 'mentee') {
      fetchProjects();
    }
  }, [user, userProfile]);

  const initializeDashboard = async () => {
    try {
      console.log('Initializing MenteeDashboard...');
      await checkUser();
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setError('Failed to initialize dashboard');
      setLoading(false);
    }
  };

  const checkUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error || !currentUser) {
        navigate('/login');
        return;
      }

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData) {
        navigate('/login');
        return;
      }

      // Check if user has access to mentee dashboard (either as primary role or in roles array)
      // Also check if this is their active role
      const hasMenteeAccess = userData.role === 'mentee' ||
        (userData.roles && userData.roles.includes('mentee'));

      const isActiveRoleMentee = (activeRole || userData.role) === 'mentee';

      if (!hasMenteeAccess || !isActiveRoleMentee) {
        // Redirect to appropriate dashboard based on active role
        const currentActiveRole = activeRole || userData.role;
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

        navigate(redirectPath);
        return;
      }

      setUser(currentUser);
      setUserProfile(userData);

    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      if (!user?.id) return;

      console.log('Fetching projects for mentee:', user.id, user.email);

      // First try a simple query to get all projects
      let { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .limit(100);

      // If that fails, try with different column names
      if (error) {
        console.log('Simple query failed, trying with different columns:', error);
        const result = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        projectsData = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
        return;
      }

      console.log('Raw projects data:', projectsData);

      // Filter projects based on user assignment
      // Check multiple ways a user could be assigned to a project
      const filteredProjects = (projectsData || []).filter(project => {
        // Check if user is in the mentees array
        if (project.mentees && Array.isArray(project.mentees)) {
          return project.mentees.includes(user.id);
        }

        // Check if user created the project
        if (project.createdBy === user.id || project.created_by === user.id) {
          return true;
        }

        // Check if user is assigned by email in mentees array (if it's an array of emails)
        if (project.mentees && Array.isArray(project.mentees) && user.email) {
          return project.mentees.some(mentee =>
            typeof mentee === 'string' && mentee.toLowerCase() === user.email.toLowerCase()
          );
        }

        // For development, if no projects are found, show all projects
        // This helps with testing when the mentees array might not be properly set up
        if (import.meta.env.DEV && (projectsData || []).length <= 3) {
          console.log('Development mode: showing all projects for testing');
          return true;
        }

        return false;
      });

      console.log('Filtered projects:', filteredProjects);
      setProjects(filteredProjects);

      // Set first project as selected if available
      if (filteredProjects.length > 0 && !selectedProject) {
        setSelectedProject(filteredProjects[0]);
      }

      // Fetch submissions for all projects
      if (filteredProjects.length > 0) {
        await fetchAllSubmissions(filteredProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchAllSubmissions = async (projectsList) => {
    try {
      const submissionsData = {};

      for (const project of projectsList) {
        try {
          const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('project_id', project.id)
            .eq('mentee_id', user.id);

          if (error) {
            if (error.code === '42P01') {
              console.log('Submissions table does not exist yet:', error.message);
              // Table doesn't exist, continue without submissions
              continue;
            } else {
              console.error('Error fetching submissions for project:', project.id, error);
              continue;
            }
          }

          if (data) {
            submissionsData[project.id] = data.reduce((acc, submission) => {
              acc[submission.stage_key] = submission;
              return acc;
            }, {});
          }
        } catch (err) {
          console.error('Error fetching submissions for project:', project.id, err);
          // Continue with next project
        }
      }

      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error in fetchAllSubmissions:', error);
      // Don't throw, just log the error and continue
    }
  };

  const validateFileType = (file, allowedTypes) => {
    if (!allowedTypes || allowedTypes.length === 0) return true;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(fileExtension);
  };

  const handleFileUpload = async (stageKey, file) => {
    if (!selectedProject || !user) {
      setError('Please select a project first');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [stageKey]: true }));
      setError(null);

      const stageConfig = submissionStages.find(stage => stage.key === stageKey);
      if (!stageConfig || stageConfig.isForm) {
        setUploading(prev => ({ ...prev, [stageKey]: false }));
        return;
      }
      if (!validateFileType(file, stageConfig.allowedTypes)) {
        setError(`Invalid file type. Allowed types: ${stageConfig.allowedTypes.map(type => `.${type}`).join(', ')}`);
        toast.error('Invalid file type selected.');
        return;
      }

      // Ensure user is authenticated before upload
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        setError('Authentication required for file upload');
        toast.error('Please log in to upload files.');
        navigate('/login');
        return;
      }

      // Upload file to Supabase Storage with proper user ID
      const fileExt = file.name.split('.').pop();
      const storagePath = `${currentUser.id}/${selectedProject.id}/${stageKey}/${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);

        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          setError('Storage bucket not configured. Please contact administrator.');
          toast.error('File upload not available - storage not configured.');
          return;
        } else if (uploadError.message.includes('row-level security')) {
          setError('Permission denied. Please contact administrator.');
          toast.error('Permission denied for file upload.');
          return;
        } else {
          setError('Failed to upload file');
          toast.error('Failed to upload file.');
          return;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Save to database
      const { data: existingSubmission, error: selectError } = await supabase
        .from('submissions')
        .select('id')
        .eq('project_id', selectedProject.id)
        .eq('mentee_id', currentUser.id)
        .eq('stage_key', stageKey)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Submission lookup error:', selectError);
        throw selectError;
      }

      const submissionPayload = {
        project_id: selectedProject.id,
        mentee_id: currentUser.id,
        stage_key: stageKey,
        filename: file.name,
        file_url: publicUrl,
        storage_path: storagePath,
        status: 'pending',
        uploaded_at: new Date().toISOString()
      };

      let dbError = null;

      if (existingSubmission) {
        const { error } = await supabase
          .from('submissions')
          .update(submissionPayload)
          .eq('id', existingSubmission.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('submissions')
          .insert(submissionPayload);
        dbError = error;
      }

      if (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to save file record');
        return;
      }

      const mentorId = selectedProject.mentor_id || selectedProject.mentor?.id || null;

      const { error: projectFilesError } = await supabase
        .from('project_files')
        .insert({
          project_id: selectedProject.id,
          uploaded_by: currentUser.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: stageConfig.label,
          mentor_id: mentorId,
        });

      if (projectFilesError) {
        console.error('project_files insert error:', projectFilesError);
      }

      // Refresh submissions for this project
      await fetchAllSubmissions([selectedProject]);
      toast.success('Uploaded successfully — visible to your mentor.');

    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
      toast.error('Failed to upload file.');
    } finally {
      setUploading(prev => ({ ...prev, [stageKey]: false }));
    }
  };

  const handleFileDelete = async (stageKey) => {
    if (!selectedProject || !user) return;

    try {
      const submissionEntry = submissions[selectedProject.id]?.[stageKey];
      if (!submissionEntry) return;

      // Delete from storage
      const rawPath = submissionEntry.storage_path || '';
      const cleanPath = rawPath.includes('?') ? rawPath.split('?')[0] : rawPath;
      const storageKey = cleanPath || `${selectedProject.id}/${stageKey}/${submissionEntry.filename}`;
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storageKey]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        setError('Failed to delete file');
        toast.error('Failed to delete file.');
        return;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionEntry.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        setError('Failed to delete file record');
        toast.error('Failed to delete file record.');
        return;
      }

      const { error: projectFilesDeleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', selectedProject.id)
        .eq('uploaded_by', user.id)
        .eq('file_url', submissionEntry.file_url);

      if (projectFilesDeleteError) {
        console.error('project_files delete error:', projectFilesDeleteError);
      }

      // Refresh submissions
      await fetchAllSubmissions([selectedProject]);
      toast.success('File deleted successfully.');

    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
      toast.error('Failed to delete file.');
    }
  };

  const handleOpenFeedbackForm = () => {
    setShowFeedbackModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // formatDate helper removed in favor of formatDateDDMMYYYY utility

  const statusBadgeStyles = {
    accepted: 'bg-green-100 text-green-700',
    'needs improvement': 'bg-yellow-100 text-yellow-700',
    pending: 'bg-blue-100 text-blue-700',
    default: 'bg-slate-100 text-slate-600'
  };

  const statusLabels = {
    accepted: 'Accepted',
    'needs improvement': 'Needs Improvement',
    pending: 'Pending'
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
      const dashboardPath = dashboardPaths[newRole] || dashboardPaths.mentee;
      console.log(`Switching to role: ${newRole}, navigating to: ${dashboardPath}`);

      // Force a small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate(dashboardPath, { replace: true });
      }, 100);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mentee Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userProfile.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddProjectForm(!showAddProjectForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showAddProjectForm ? 'Cancel' : 'Add Project'}
              </button>

              {/* Role Switching Buttons - Only show for non-mentee roles */}
              {authUserProfile?.roles && authUserProfile.roles.length > 1 &&
                authUserProfile.roles.some(role => role && role !== 'mentee') && (
                  <div className="flex space-x-2">
                    {authUserProfile.roles
                      .filter(role => role && role !== 'mentee') // Exclude mentee role
                      .map((role) => (
                        <button
                          key={role}
                          onClick={() => switchToRole(role)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${activeRole === role
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {role === 'project_coordinator' ? 'Coordinator' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                  </div>
                )}

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
                {error.includes('Storage bucket not configured') && (
                  <p className="text-xs text-red-600 mt-1">
                    The submissions storage bucket needs to be created in Supabase.
                    Contact your administrator or run the setup scripts.
                  </p>
                )}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedProject ? (
          <div className="text-center py-12">
            <FaFileAlt className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projects.length === 0 ? 'No projects assigned' : 'Loading project dashboard...'}
            </h3>
            <p className="text-gray-500">
              {projects.length === 0
                ? 'You haven\'t been assigned to any projects yet.'
                : 'Please wait while we load your project dashboard.'}
            </p>
          </div>
        ) : (
          <>
            {/* Project Info */}
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProject.project_name || selectedProject.title || selectedProject.projectName}</h2>
                <p className="text-gray-600 mb-4">{selectedProject.project_details || selectedProject.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs font-medium mb-1">Domain</div>
                    <div className="text-gray-900 font-medium">{selectedProject.domain || 'Not specified'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs font-medium mb-1">Mentor</div>
                    <div className="text-gray-900 font-medium">{selectedProject.mentor?.name || selectedProject.mentor_email || 'Unassigned'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs font-medium mb-1">Project Duration</div>
                    <div className="text-gray-900 font-medium">
                      {selectedProject.duration || selectedProject.coordinatorAssignment?.duration || 'Not specified'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs font-medium mb-1">Deadline</div>
                    <div className="text-gray-900 font-medium">
                      {formatDateDDMMYYYY(selectedProject.deadline)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {submissionStages.map((stageConfig) => {
                const projectSubmissions = submissions[selectedProject.id] || {};
                const submissionEntry = projectSubmissions[stageConfig.key];
                const isUploading = uploading[stageConfig.key];
                const statusKey = (submissionEntry?.status || 'pending').toLowerCase();
                const statusClass = statusBadgeStyles[statusKey] || statusBadgeStyles.default;
                const statusLabel = statusLabels[statusKey] || 'Pending';
                const allowedLabel = stageConfig.allowedTypes.length > 0 ? stageConfig.allowedTypes.join(', ') : 'Any file type';
                const acceptAttr = stageConfig.allowedTypes.length > 0 ? stageConfig.allowedTypes.map(type => `.${type}`).join(',') : undefined;

                if (stageConfig.isForm) {
                  return (
                    <div
                      key={stageConfig.key}
                      className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{stageConfig.label}</h3>
                          <p className="text-sm text-slate-500">Click below to fill your feedback form.</p>
                        </div>
                        <span className="text-2xl">{stageConfig.icon}</span>
                      </div>
                      <button
                        onClick={handleOpenFeedbackForm}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
                      >
                        <FaUpload /> Open Form
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={stageConfig.key}
                    className={`bg-white border rounded-2xl shadow-sm p-6 flex flex-col gap-4 transition ${submissionEntry ? 'border-blue-300 shadow-md' : 'border-slate-200'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{stageConfig.label}</h3>
                        <p className="text-sm text-slate-500">Allowed: {allowedLabel}</p>
                      </div>
                      {submissionEntry && <FaCheckCircle className="h-6 w-6 text-green-500" />}
                    </div>

                    {submissionEntry ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-blue-900 truncate flex items-center gap-2">
                                <FaFileAlt className="text-blue-500" /> {submissionEntry.filename}
                              </p>
                              {submissionEntry.uploaded_at && (
                                <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                                  <FaClock className="text-blue-400" />
                                  {formatDateDDMMYYYY(submissionEntry.uploaded_at)}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              if (!submissionEntry) return;

                              try {
                                console.log('Attempting to view file:', submissionEntry);

                                // For private storage, we need to get a signed URL
                                let viewUrl = submissionEntry.file_url;

                                // If we have a storage_path, try to get a signed URL
                                if (submissionEntry.storage_path) {
                                  console.log('Getting signed URL for:', submissionEntry.storage_path);

                                  const { data, error } = await supabase.storage
                                    .from(STORAGE_BUCKET)
                                    .createSignedUrl(submissionEntry.storage_path, 3600); // 1 hour expiry

                                  if (error) {
                                    console.error('Error creating signed URL:', error);
                                    // Fallback to public URL
                                    const { data: { publicUrl } } = supabase.storage
                                      .from(STORAGE_BUCKET)
                                      .getPublicUrl(submissionEntry.storage_path);
                                    viewUrl = publicUrl;
                                  } else {
                                    viewUrl = data.signedUrl;
                                    console.log('Got signed URL:', viewUrl);
                                  }
                                }

                                // Open the file in a new tab
                                if (viewUrl) {
                                  const newWindow = window.open(viewUrl, '_blank');
                                  if (!newWindow || newWindow.closed) {
                                    toast.error('Unable to open file. Please check if pop-ups are blocked.');
                                  } else {
                                    toast.success('Opening file...');
                                  }
                                } else {
                                  toast.error('No file URL available');
                                }
                              } catch (error) {
                                console.error('Error opening file:', error);
                                toast.error('Unable to open file. Please try downloading instead.');
                              }
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          >
                            <FaEye /> View
                          </button>
                          <button
                            onClick={async () => {
                              if (!submissionEntry) return;

                              try {
                                console.log('Attempting to download file:', submissionEntry);

                                let downloadUrl = submissionEntry.file_url;

                                // For private storage, get a signed URL for download
                                if (submissionEntry.storage_path) {
                                  console.log('Getting signed URL for download:', submissionEntry.storage_path);

                                  const { data, error } = await supabase.storage
                                    .from(STORAGE_BUCKET)
                                    .createSignedUrl(submissionEntry.storage_path, 3600); // 1 hour expiry

                                  if (error) {
                                    console.error('Error creating signed URL for download:', error);
                                    // Fallback to public URL
                                    const { data: { publicUrl } } = supabase.storage
                                      .from(STORAGE_BUCKET)
                                      .getPublicUrl(submissionEntry.storage_path);
                                    downloadUrl = publicUrl;
                                  } else {
                                    downloadUrl = data.signedUrl;
                                    console.log('Got signed URL for download:', downloadUrl);
                                  }
                                }

                                // Create download link
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = submissionEntry.filename || `${stageConfig.key}`;
                                link.target = '_blank'; // Open in new tab as fallback
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);

                                toast.success('Download started...');
                              } catch (error) {
                                console.error('Error downloading file:', error);
                                toast.error('Unable to download file. Please try again.');
                              }
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                          >
                            <FaDownload /> Download
                          </button>
                          <button
                            onClick={() => handleFileDelete(stageConfig.key)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>

                        <label className="w-full flex items-center justify-center px-4 py-3 border border-dashed border-blue-300 rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition">
                          <FaUpload className="mr-2 text-blue-600" />
                          {isUploading ? 'Uploading...' : 'Replace File'}
                          <input
                            type="file"
                            className="hidden"
                            accept={acceptAttr}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(stageConfig.key, file);
                            }}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="w-full flex flex-col items-center justify-center gap-3 px-4 py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer">
                        {isUploading ? (
                          <>
                            <FaSpinner className="text-xl animate-spin" />
                            <span className="text-sm font-medium">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FaUpload className="text-2xl text-blue-500" />
                            <span className="text-sm font-semibold text-blue-600">Upload File</span>
                            <span className="text-xs text-slate-400">{allowedLabel}</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept={acceptAttr}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(stageConfig.key, file);
                          }}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Feedback Form Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Feedback Form</h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <p className="text-gray-600">Feedback Form will appear here.</p>
                <p className="text-sm text-gray-500 mt-2">Form fields will be defined later.</p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenteeDashboard;