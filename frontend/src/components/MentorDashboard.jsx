import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import toast from 'react-hot-toast';
import {
  FaEye,
  FaDownload,
  FaTrash,
  FaCommentDots,
  FaSpinner,
  FaSignOutAlt,
  FaSearch,
  FaCalendarAlt
} from 'react-icons/fa';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import RoleSwitcher from './RoleSwitcher';
import Loader from './ui/Loader';

const submissionStages = [
  { key: 'ideaPresentation', label: 'Idea Presentation', allowedTypes: ['pdf'] },
  { key: 'progress1', label: 'Progress 1', allowedTypes: ['pdf', 'docx'] },
  { key: 'progress2', label: 'Progress 2', allowedTypes: ['pdf'] },
  { key: 'progress3', label: 'Progress 3', allowedTypes: ['ppt', 'pdf'] },
  { key: 'progress4', label: 'Progress 4', allowedTypes: ['ppt', 'pdf'] },
  { key: 'phase1', label: 'Phase 1 Report', allowedTypes: ['pdf'] },
  { key: 'finalReport', label: 'Final Report', allowedTypes: ['pdf'] },
  { key: 'finalDemo', label: 'Final Demo', allowedTypes: ['mp4', 'mkv'] },
  { key: 'finalPpt', label: 'Final PPT', allowedTypes: ['pdf'] },
  { key: 'codebook', label: 'Codebook', allowedTypes: ['docx', 'pdf'] }
];


const statusOptions = [
  { value: 'accepted', label: 'Accepted', icon: '✅', color: 'text-green-600' },
  { value: 'needs improvement', label: 'Needs Improvement', icon: '⚠️', color: 'text-yellow-600' },
  { value: 'pending', label: 'Pending', icon: '⏳', color: 'text-gray-600' }
];

// formatDate helper removed in favor of formatDateDDMMYYYY utility

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { signOut, userProfile, activeRole, updateActiveRole, updateUserProfile } = useAuth();
  const { selectedYear, isProjectInYear } = useAcademicYear();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mentor, setMentor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [projectDeliverables, setProjectDeliverables] = useState({});
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [remarkModal, setRemarkModal] = useState({ open: false, submission: null, remark: '' });
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [remark, setRemark] = useState('');
  const [selectedMenteeId, setSelectedMenteeId] = useState(null);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [projectFiles, setProjectFiles] = useState({});
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false);
  const [showBecomeMenu, setShowBecomeMenu] = useState(false);
  const projectFileChannelRef = useRef(null);
  const currentProjectIdsRef = useRef([]);

  // Restoration: Search State
  const [searchTerm, setSearchTerm] = useState('');



  // Restoration: Filtered Projects Logic
  const filteredProjects = useMemo(() => {
    // First filter by Academic Year
    let result = projects.filter(p => isProjectInYear(p));

    // Then filter by Search Term
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(project => {
        // 1. Search by Project Name
        if (project.title?.toLowerCase().includes(lowerTerm) ||
          project.project_name?.toLowerCase().includes(lowerTerm)) {
          return true;
        }
        // 2. Search by Mentee Name/Email
        if (project.mentees && project.mentees.length > 0) {
          const hasMatchingMentee = project.mentees.some(mentee =>
            (mentee.name && mentee.name.toLowerCase().includes(lowerTerm)) ||
            (mentee.email && mentee.email.toLowerCase().includes(lowerTerm))
          );
          if (hasMatchingMentee) return true;
        }
        return false;
      });
    }
    return result;
  }, [projects, searchTerm, isProjectInYear]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          navigate('/');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Check if user has access to mentor dashboard (either as primary role or in roles array)
        // Also check if this is their active role
        const hasMentorAccess = profile?.role === 'mentor' ||
          (profile?.roles && profile.roles.includes('mentor'));

        const isActiveRoleMentor = (activeRole || profile.role) === 'mentor';

        if (!hasMentorAccess || !isActiveRoleMentor) {
          // Redirect to appropriate dashboard based on active role
          const currentActiveRole = activeRole || profile.role;
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

        const normalizedEmail = (profile.email || user.email || '').trim();
        const normalizedId = profile.id || user.id;
        setMentor({ ...profile, id: normalizedId, email: normalizedEmail });
      } catch (authError) {
        console.error('Auth error:', authError);
        toast.error('Unable to authenticate mentor.');
        navigate('/');
      } finally {
        setCheckingAuth(false);
      }
    };

    init();
  }, [navigate]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedProjectId) {
      setSubmissions([]);
      return;
    }

    setLoadingSubmissions(true);
    setError(null);

    try {
      const { data, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: true });

      if (submissionsError) throw submissionsError;

      setSubmissions(data || []);
    } catch (loadError) {
      console.error('Submissions load error:', loadError);
      setError('Failed to load submissions.');
      toast.error('Failed to load submissions.');
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);



  // Realtime subscription for submissions
  useEffect(() => {
    if (!selectedProjectId) return;

    const subscription = supabase
      .channel(`mentor_submissions_${selectedProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `project_id=eq.${selectedProjectId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubmissions(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setSubmissions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
          } else if (payload.eventType === 'DELETE') {
            setSubmissions(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!mentor || !selectedYear) return;
      setLoadingProjects(true);
      setError(null);

      const mentorId = mentor?.id || null;

      const emailVariants = new Set();
      if (mentor?.email) {
        const trimmed = mentor.email.trim();
        if (trimmed) {
          emailVariants.add(trimmed);
          emailVariants.add(trimmed.toLowerCase());
          emailVariants.add(trimmed.toUpperCase());
        }
      }

      try {
        const normalizedProjectMap = {};
        const aggregatedProjectIds = new Set();

        // 1. Fetch projects directly assigned to mentor
        const projectFilters = [];
        if (mentorId) projectFilters.push(`mentor_id.eq.${mentorId}`);
        emailVariants.forEach(emailValue => {
          projectFilters.push(`mentor_email.eq.${emailValue}`);
        });

        if (projectFilters.length > 0) {
          let directQuery = supabase
            .from('projects')
            .select('*')
            .or(projectFilters.join(','))
            .order('created_at', { ascending: false });

          if (selectedYear && selectedYear.name) {
            directQuery = directQuery.contains('visible_sessions', [selectedYear.name]);
          }

          const { data: directProjects, error: projectsError } = await directQuery;

          if (projectsError) throw projectsError;

          (directProjects || []).forEach(project => {
            if (!project?.id) return;
            normalizedProjectMap[project.id] = { ...project, mentees: [] };
            aggregatedProjectIds.add(project.id);
          });
        }

        // 2. Fetch projects where mentor is a team member with role 'mentor'
        // 2. Fetch projects where mentor is a team member with role 'mentor'
        const teamFilters = [];
        // 'project_team_members' table uses 'user_id' and 'role'. It does not have an 'email' column.
        if (mentorId) teamFilters.push(`user_id.eq.${mentorId}`);
        // Removed email filters as the table doesn't support them.

        if (teamFilters.length > 0) {
          const { data: teamAssignments, error: teamError } = await supabase
            .from('project_team_members')
            .select('project_id, role, user_id') // Removed 'email', changed 'role_in_project' to 'role'
            .or(teamFilters.join(','));

          if (teamError) throw teamError;

          const mentorRoleMatch = (role) => {
            if (!role) return false;
            const normalized = role.toLowerCase();
            return normalized.includes('mentor');
          };

          const assignmentProjectIds = new Set();
          (teamAssignments || []).forEach(entry => {
            if (!entry?.project_id) return;
            // Check 'role' instead of 'role_in_project'
            if (!entry.role || mentorRoleMatch(entry.role)) {
              assignmentProjectIds.add(entry.project_id);
            }
          });

          const missingIds = Array.from(assignmentProjectIds).filter(projectId => !normalizedProjectMap[projectId]);

          if (missingIds.length > 0) {
            let assignedQuery = supabase
              .from('projects')
              .select('*')
              .in('id', missingIds)
              .order('created_at', { ascending: false });

            if (selectedYear && selectedYear.name) {
              assignedQuery = assignedQuery.contains('visible_sessions', [selectedYear.name]);
            }

            const { data: assignedProjects, error: assignedError } = await assignedQuery;

            if (assignedError) throw assignedError;

            (assignedProjects || []).forEach(project => {
              if (!project?.id) return;
              normalizedProjectMap[project.id] = { ...project, mentees: [] };
              aggregatedProjectIds.add(project.id);
            });
          }

          assignmentProjectIds.forEach(id => aggregatedProjectIds.add(id));
        }

        // 3. Fetch Mentees Logic (NEW)
        const projectIds = Array.from(aggregatedProjectIds);

        if (projectIds.length > 0) {
          // A. Fetch from project_team_members
          const { data: teamMembers, error: teamMembersError } = await supabase
            .from('project_team_members')
            .select('*, user:users!user_id(id, full_name, email)')
            .in('project_id', projectIds);

          if (!teamMembersError && teamMembers) {
            teamMembers.forEach(member => {
              if (normalizedProjectMap[member.project_id]) {
                const memberEmail = member.user?.email;
                const memberName = member.user?.full_name;
                const memberRole = member.role;

                // Filter out the mentor themselves
                const isMentor = member.user_id === mentorId ||
                  (memberEmail && emailVariants.has(memberEmail)) ||
                  (memberRole && memberRole.toLowerCase().includes('mentor'));

                if (!isMentor) {
                  normalizedProjectMap[member.project_id].mentees.push({
                    name: memberName || memberEmail?.split('@')[0] || 'Unknown',
                    email: memberEmail,
                    source: 'team_member'
                  });
                }
              }
            });
          }

          // B. Fetch from project_assignments -> project_assignment_mentees (CSV imports)
          const { data: assignments, error: assignmentsError } = await supabase
            .from('project_assignments')
            .select('id, project_id')
            .in('project_id', projectIds);

          if (!assignmentsError && assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);
            const assignmentMap = assignments.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.project_id }), {});

            const { data: assignmentMentees, error: assignmentMenteesError } = await supabase
              .from('project_assignment_mentees')
              .select('*')
              .in('assignment_id', assignmentIds);

            if (!assignmentMenteesError && assignmentMentees) {
              assignmentMentees.forEach(am => {
                const projectId = assignmentMap[am.assignment_id];
                if (normalizedProjectMap[projectId]) {
                  normalizedProjectMap[projectId].mentees.push({
                    name: am.mentee_name || am.mentee_email?.split('@')[0],
                    email: am.mentee_email,
                    source: 'assignment'
                  });
                }
              });
            }
          }
        }

        // Deduplicate mentees by email per project
        Object.values(normalizedProjectMap).forEach(project => {
          const uniqueMentees = {};
          project.mentees.forEach(m => {
            if (m.email) uniqueMentees[m.email] = m;
          });
          project.mentees = Object.values(uniqueMentees);
        });

        const finalProjects = Array.from(Object.values(normalizedProjectMap))
          .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));

        // Filter projects by academic year
        const filteredProjects = finalProjects.filter(project =>
          isProjectInYear(project)
        );

        setProjects(filteredProjects);
        setError(null);

        if (filteredProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(filteredProjects[0]?.id || null);
        }

        if (filteredProjects.length > 0) {
          try {
            await fetchAllProjectDeliverables(filteredProjects);
          } catch (fetchError) {
            console.error('Error fetching deliverables:', fetchError);
          }
          const finalProjectIds = filteredProjects.map(project => project.id).filter(Boolean);
          currentProjectIdsRef.current = finalProjectIds;
          await fetchProjectFiles(finalProjectIds);
          setupProjectFilesSubscription(finalProjectIds);
        } else {
          currentProjectIdsRef.current = [];
          setProjectFiles({});
          if (projectFileChannelRef.current) {
            await supabase.removeChannel(projectFileChannelRef.current);
            projectFileChannelRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error in fetchProjects:', error);
        setError('Failed to load projects');
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [mentor]);

  // Refetch projects when year changes
  useEffect(() => {
    if (mentor && selectedYear) {
      fetchProjects();
    }
  }, [selectedYear]);

  const fetchProjectFiles = async (projectIds) => {
    if (!mentor || !mentor.id || !projectIds || projectIds.length === 0) {
      setProjectFiles({});
      return;
    }

    setLoadingProjectFiles(true);

    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, project_id, uploaded_by, mentor_id, file_name, file_url, file_type, created_at')
        .eq('mentor_id', mentor.id)
        .in('project_id', projectIds);

      if (error) {
        throw error;
      }

      const menteeIds = Array.from(new Set((data || []).map(file => file.uploaded_by).filter(Boolean)));
      let uploaderMap = {};

      if (menteeIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', menteeIds);

        if (usersError) {
          throw usersError;
        }

        uploaderMap = (usersData || []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }

      const filesByProject = projectIds.reduce((acc, projectId) => {
        acc[projectId] = [];
        return acc;
      }, {});

      (data || []).forEach(file => {
        if (!filesByProject[file.project_id]) return;
        const uploader = uploaderMap[file.uploaded_by];
        const uploaderName = uploader?.full_name || uploader?.name || uploader?.email || 'Mentee';
        const uploaderEmail = uploader?.email || '';
        filesByProject[file.project_id].push({
          ...file,
          uploaderName,
          uploaderEmail
        });
      });

      setProjectFiles(filesByProject);
    } catch (fetchError) {
      console.error('Error fetching project files:', fetchError);
      setError(prev => prev || 'Failed to load project files');
    } finally {
      setLoadingProjectFiles(false);
    }
  };

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const submissionsByStage = useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      map.set(sub.stage_key, sub);
    });
    return map;
  }, [submissions]);

  const projectLookup = useMemo(() => {
    const lookup = {};
    projects.forEach(project => {
      lookup[project.id] = project;
    });
    return lookup;
  }, [projects]);

  const handleStatusChange = async (submission, newStatus) => {
    if (!submission) return;
    try {
      const updating = toast.loading('Updating status...');
      const { data: updatedData, error: updateError } = await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', submission.id)
        .select();

      if (updateError) throw updateError;

      if (!updatedData || updatedData.length === 0) {
        throw new Error('Status update failed: Permission denied.');
      }

      toast.success('Status updated.');

      // Update local state
      setSubmissions(prev => prev.map(item => item.id === submission.id ? { ...item, status: newStatus } : item));
      toast.dismiss(updating);
    } catch (statusError) {
      console.error('Status update error:', statusError);
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteSubmission = async (submission) => {
    if (!submission) return;

    if (!window.confirm('Delete this file? This action cannot be undone.')) {
      return;
    }

    const deleting = toast.loading('Deleting file...');

    try {
      const filePath = submission.file_url?.split('/').pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('project-deliverables')
          .remove([`project-deliverables/${filePath}`]);

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submission.id);

      if (deleteError) throw deleteError;

      setSubmissions(prev => prev.filter(item => item.id !== submission.id));
      toast.success('File deleted.');
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      toast.error('Failed to delete file.');
    } finally {
      toast.dismiss(deleting);
    }
  };

  const handleOpenRemarkModal = (submission) => {
    if (!submission) return;
    setRemarkModal({ open: true, submission, remark: submission?.remark || '' });
  };

  const handleSaveRemark = async () => {
    if (!remarkModal.submission) {
      setRemarkModal({ open: false, submission: null, remark: '' });
      return;
    }

    const saving = toast.loading('Saving remark...');

    try {
      const { data: updatedData, error: remarkError } = await supabase
        .from('submissions')
        .update({ remark: remarkModal.remark.trim() })
        .eq('id', remarkModal.submission.id)
        .select();

      if (remarkError) throw remarkError;

      if (!updatedData || updatedData.length === 0) {
        throw new Error('Update failed: Permission denied or submission not found.');
      }

      // Update local state immediately to reflect the change
      setSubmissions(prev => (
        prev.map(item => item.id === remarkModal.submission.id ? { ...item, remark: remarkModal.remark.trim() } : item)
      ));

      toast.success('Remark saved successfully!');
      setRemarkModal({ open: false, submission: null, remark: '' });

      // Reload submissions to ensure data consistency
      await loadSubmissions();
    } catch (remarkError) {
      console.error('Remark save error:', remarkError);
      toast.error('Failed to save remark. Please try again.');
    } finally {
      toast.dismiss(saving);
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
      const dashboardPath = dashboardPaths[newRole] || dashboardPaths.mentor;
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

  const fetchAllProjectDeliverables = async (projects) => {
    if (!projects?.length) {
      setProjectDeliverables({});
      return;
    }

    try {
      const projectIds = projects.map(p => p.id).filter(Boolean);
      if (!projectIds.length) return;

      // Fetch submissions directly instead of using non-existent RPC function
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        throw submissionsError;
      }

      // Process the data
      const deliverablesByProject = {};
      (submissionsData || []).forEach(submission => {
        const projectId = submission.project_id;
        if (!projectId) return;

        if (!deliverablesByProject[projectId]) {
          deliverablesByProject[projectId] = [];
        }

        deliverablesByProject[projectId].push({
          ...submission,
          users: {
            id: submission.user_id,
            name: submission.user_name || 'Unknown User',
            email: submission.user_email || 'unknown'
          }
        });
      });

      setProjectDeliverables(deliverablesByProject);
    } catch (error) {
      console.error('Error in fetchAllProjectDeliverables:', error);
    }
  };

  const setupProjectFilesSubscription = (projectIds) => {
    if (!projectIds || projectIds.length === 0) {
      return;
    }

    // Clean up existing subscription
    if (projectFileChannelRef.current) {
      supabase.removeChannel(projectFileChannelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('project_files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_files',
          filter: `mentor_id=eq.${mentor?.id}`
        },
        (payload) => {
          console.log('Project files change received:', payload);

          // Refresh project files for the affected project
          if (payload.new?.project_id) {
            fetchProjectFiles([payload.new.project_id]);
          }
        }
      )
      .subscribe();

    projectFileChannelRef.current = channel;
  };



  if (checkingAuth) {
    return (
      <Loader />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0F19] text-gray-100">
      <aside className="w-full md:w-1/4 lg:w-1/5 bg-gradient-to-b from-[#0B0F19] to-[#1B2430] border-r border-slate-800 flex flex-col h-screen sticky top-0">
        <div className="px-6 py-8 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Mentor Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Review assigned projects and submissions</p>
          {selectedYear && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-blue-900/40 text-blue-200 text-xs font-semibold border border-blue-800/50 flex items-center">
              <FaCalendarAlt className="mr-2" />
              AY: {selectedYear.name}
            </div>
          )}

          {/* Restoration: Search Bar */}
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search projects by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
            />
            <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-xs" />
          </div>
        </div>

        <div className="px-4 py-6 space-y-4 flex-1 overflow-y-auto">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <FaSpinner className="animate-spin mr-2" />
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10">
              {searchTerm ? 'No matching projects.' : `No projects found for AY ${selectedYear?.name || ''}`}
            </div>
          ) : (
            filteredProjects.map(project => {
              const isActive = project.id === selectedProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border ${isActive
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                    : 'bg-slate-800/50 border-transparent hover:border-blue-400 hover:bg-slate-800'
                    }`}
                >
                  <div className="text-sm font-semibold truncate">{project.title || project.project_name}</div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{project.domain || 'No domain'}</div>
                  {project.mentees && project.mentees.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <div className="text-xs font-medium text-slate-300 mb-1">
                        Mentees ({project.mentees.length}):
                      </div>
                      <div className="space-y-1">
                        {project.mentees.map((mentee, idx) => (
                          <div key={idx} className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                            <span className="text-slate-300">{mentee.name}</span>
                            <span className="text-slate-500 hidden sm:inline">({mentee.email})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-6 py-6 border-t border-slate-800">
          <div className="mb-4">
            <div className="text-sm font-semibold text-white">{mentor?.name || 'Mentor'}</div>
            <div className="text-xs text-slate-400 capitalize">{mentor?.role}</div>
          </div>

          {/* Role Switching & Become Actions Block */}
          <div className="flex flex-col gap-2 w-full mb-4">
            {/* Only show RoleSwitcher if user has multiple roles (handled internally, but explicit here for clarity) */}


            {/* Become Role Button - Only show if user doesn't have multiple roles yet */}
            {(!userProfile?.roles || userProfile.roles.filter(r => r !== 'mentee').length <= 1) && (
              <div className="relative">
                <button
                  onClick={() => setShowBecomeMenu(!showBecomeMenu)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                >
                  Become
                </button>

                {showBecomeMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-xl py-1 z-50 border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => handleBecomeRole('hod')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors border-b border-gray-100"
                    >
                      Become a HOD
                    </button>
                    <button
                      onClick={() => handleBecomeRole('project_coordinator')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
                    >
                      Become a Coordinator
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>



      </aside>

      <main className="flex-1 bg-gray-50 text-gray-900 min-h-screen">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <p>Select a project to view submissions.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-8">
            <header className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{selectedProject.title || selectedProject.project_name}</h1>
                  <p className="text-slate-500 mt-2 max-w-3xl">{selectedProject.description || selectedProject.project_details || 'No description provided.'}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                      {selectedProject.domain || 'Domain not set'}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      <span className="text-slate-600 text-xs mr-1">Duration:</span> {selectedProject.duration_months || (selectedProject.deadline ? Math.round((new Date(selectedProject.deadline) - new Date(selectedProject.created_at || Date.now())) / (1000 * 60 * 60 * 24 * 30.44)) : 12)} months
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-slate-400">
                    Last updated: {formatDateDDMMYYYY(selectedProject.updated_at || selectedProject.created_at)}
                  </span>
                </div>
              </div>
            </header>

            <section className="bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Uploaded Files Overview</h2>
                  <p className="text-sm text-slate-500">Track mentee submissions for each stage.</p>
                </div>
                {loadingSubmissions && (
                  <div className="flex items-center text-sm text-slate-400">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading submissions...
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Section</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Filename</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {submissionStages.map(stage => {
                      const submission = submissionsByStage.get(stage.key);
                      const statusOption = statusOptions.find(option => option.value === (submission?.status || '').toLowerCase());

                      return (
                        <tr key={stage.key} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{stage.label}</span>
                              <span className="text-xs text-slate-400">{stage.allowedTypes.length > 0 ? stage.allowedTypes.join(', ') : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {stage.key === 'finalDemo' ? (
                              selectedProject && selectedProject.demo_link ? (
                                <a
                                  href={selectedProject.demo_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                >
                                  <FaEye className="text-xs" /> Link Provided
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">No link provided</span>
                              )
                            ) : (
                              submission ? submission.filename : '–'
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {submission ? (
                              <div className="relative inline-block text-left">
                                <select
                                  value={(submission.status || 'pending').toLowerCase()}
                                  onChange={(event) => handleStatusChange(submission, event.target.value)}
                                  className="appearance-none bg-slate-100 border border-slate-300 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                  {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">⌄</span>
                                {statusOption && (
                                  <div className={`mt-2 text-xs font-semibold ${statusOption.color}`}>
                                    {statusOption.icon} {statusOption.label}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">Not submitted</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {stage.key === 'finalDemo' ? (
                                selectedProject && selectedProject.demo_link ? (
                                  <button
                                    onClick={() => window.open(selectedProject.demo_link, '_blank')}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition bg-green-100 text-green-700 hover:bg-green-200"
                                  >
                                    <FaEye /> Open Link
                                  </button>
                                ) : (
                                  <button disabled className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition bg-slate-100 text-slate-400 cursor-not-allowed">
                                    <FaEye /> No Link
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!submission) return;
                                      try {
                                        try {
                                          if (submission.file_url && submission.file_url.startsWith('http')) {
                                            window.open(submission.file_url, '_blank');
                                            return;
                                          }
                                          if (submission.file_path) {
                                            const { data, error } = await supabase.storage
                                              .from('submissions')
                                              .createSignedUrl(submission.file_path, 3600);
                                            if (error) throw error;
                                            if (data?.signedUrl) {
                                              window.open(data.signedUrl, '_blank');
                                              return;
                                            }
                                          }
                                          if (submission.file_url) {
                                            window.open(submission.file_url, '_blank');
                                            return;
                                          }
                                          throw new Error('No valid file URL or path found');
                                        } catch (innerError) {
                                          throw innerError;
                                        }
                                      } catch (error) {
                                        console.error('Error viewing file:', error);
                                        toast.error('Failed to open file. Please try again.');
                                      }
                                    }}
                                    disabled={!submission}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${submission ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      }`}
                                  >
                                    <FaEye /> View
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!submission) return;
                                      const loadingToast = toast.loading('Preparing download...');
                                      try {
                                        if (submission.file_url?.startsWith('http')) {
                                          const link = document.createElement('a');
                                          link.href = submission.file_url;
                                          link.download = submission.filename || 'submission';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          toast.dismiss(loadingToast);
                                          toast.success('Download started');
                                          return;
                                        }
                                        let filePath = submission.file_path || submission.filename;
                                        if (filePath) {
                                          filePath = filePath.replace(/^[\/\\]+/, '');
                                          const { data, error } = await supabase.storage
                                            .from('submissions')
                                            .createSignedUrl(filePath, 3600);
                                          if (error) throw error;
                                          if (data?.signedUrl) {
                                            const link = document.createElement('a');
                                            link.href = data.signedUrl;
                                            link.download = submission.filename || filePath.split('/').pop() || 'download';
                                            link.target = '_blank';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            toast.dismiss(loadingToast);
                                            toast.success('Download started');
                                            return;
                                          }
                                        }
                                        throw new Error('No valid file URL or path found for download');
                                      } catch (error) {
                                        console.error('Download error:', error);
                                        toast.dismiss(loadingToast);
                                        toast.error(error.message || 'Failed to download file');
                                      }
                                    }}
                                    disabled={!submission}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${submission ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      }`}
                                  >
                                    <FaDownload /> Download
                                  </button>
                                  <button
                                    onClick={() => submission && handleOpenRemarkModal(submission)}
                                    disabled={!submission}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${submission ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      }`}
                                  >
                                    <FaCommentDots /> Save Remark
                                  </button>

                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!loadingSubmissions && submissions.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-6">No submissions yet.</div>
                )}
              </div>
            </section>

            <section className="mt-8 bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Project Files</h2>
                  <p className="text-sm text-slate-500">Recent uploads from mentees on this project.</p>
                </div>
                {loadingProjectFiles && (
                  <div className="flex items-center text-sm text-slate-400">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading files...
                  </div>
                )}
              </div>

              {/* NEW: Feedback Submissions List (Persistent) */}


              <div className="overflow-x-auto">
                {(() => {
                  const files = projectFiles[selectedProject.id] || [];
                  if (!loadingProjectFiles && files.length === 0) {
                    return (
                      <div className="text-center text-slate-400 text-sm py-6">
                        No files uploaded yet.
                      </div>
                    );
                  }

                  return (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Project</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Uploaded By</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">File Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Upload Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {files.map(file => {
                          const projectName = projectLookup[file.project_id]?.title || projectLookup[file.project_id]?.project_name || 'Project';
                          return (
                            <tr key={file.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4 text-sm text-slate-700">{projectName}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{file.uploaderName}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{file.file_type || 'Submission'}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">{formatDateDDMMYYYY(file.created_at)}</td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => window.open(file.file_url, '_blank')}
                                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                  <FaEye /> View File
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </section>
          </div>
        )}
      </main>

      {
        remarkModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Add Remark</h3>
              <p className="text-sm text-slate-500 mb-4">
                {remarkModal.submission?.filename || 'Submission'}
              </p>
              <textarea
                value={remarkModal.remark}
                onChange={event => setRemarkModal(prev => ({ ...prev, remark: event.target.value }))}
                rows={4}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-900 placeholder-slate-400"
                placeholder="Enter feedback for this submission"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setRemarkModal({ open: false, submission: null, remark: '' })}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRemark}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Save Remark
                </button>
              </div>
            </div>
          </div>
        )
      }


    </div >
  );
};

export default MentorDashboard;
