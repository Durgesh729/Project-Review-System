import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCalendar, FaGithub, FaUser, FaUsers, FaProjectDiagram, FaEdit, FaPlus, FaUpload, FaEye, FaTrash } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const formatUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
    {children}
  </span>
);

const Star = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" className={filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-300'}>
    <path stroke="currentColor" strokeWidth="1.5" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

const StarRow = ({ value = 0 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => <Star key={n} filled={n <= Math.round(value)} />)}
  </div>
);

const Avatars = ({ members = [] }) => (
  <div className="flex -space-x-2">
    {members.slice(0, 5).map((m, i) => (
      <div key={i} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white text-sm ring-2 ring-white" title={`${m.name}${m.role ? ' - ' + m.role : ''}`}>
        {(m.name || '?').substring(0, 1).toUpperCase()}
      </div>
    ))}
    {members.length > 5 && (
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-700 text-sm ring-2 ring-white">
        +{members.length - 5}
      </div>
    )}
  </div>
);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projectUpdates, setProjectUpdates] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('project_details')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select(`
          *,
          users:user_id (
            name,
            email,
            role
          )
        `)
        .eq('project_id', id);

      if (teamError) throw teamError;
      setTeamMembers(teamData || []);

      // Fetch project updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_updates')
        .select(`
          *,
          users:user_id (
            name,
            email
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setProjectUpdates(updatesData || []);

      // Fetch project files
      const { data: filesData, error: filesError } = await supabase
        .from('project_files')
        .select(`
          *,
          users:uploaded_by (
            name,
            email
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;
      setProjectFiles(filesData || []);

    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // formatDate helper removed in favor of formatDateDDMMYYYY utility

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = () => {
    return user && (
      user.id === project?.created_by ||
      user.id === project?.mentor_id ||
      userProfile?.role === 'hod' ||
      userProfile?.role === 'project_coordinator'
    );
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                  {canEdit() && (
                    <button className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                      <FaEdit className="mr-1" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <StarRow value={project.avg_rating || 0} />
                  <span className="text-sm text-gray-500">({project.ratings_count || 0} reviews)</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <FaProjectDiagram className="mr-1" />
                    {project.domain}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FaUser className="mr-1" />
                    Created by {project.creator_name}
                  </div>
                </div>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">{project.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.mentor_name_full && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaUser className="mr-2" />
                      <div>
                        <p className="font-medium">Mentor</p>
                        <p>{project.mentor_name_full}</p>
                      </div>
                    </div>
                  )}

                  {project.deadline && (userProfile?.role === 'hod' || userProfile?.role === 'project_coordinator') && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaCalendar className="mr-2" />
                      <div>
                        <p className="font-medium">Deadline</p>
                        <p>{formatDateDDMMYYYY(project.deadline)}</p>
                      </div>
                    </div>
                  )}

                  {project.demo_link && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaProjectDiagram className="mr-2" />
                      <div>
                        <p className="font-medium">Demo Link</p>
                        <a
                          href={formatUrl(project.demo_link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Demo
                        </a>
                      </div>
                    </div>
                  )}

                  {project.github_repo && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FaGithub className="mr-2" />
                      <div>
                        <p className="font-medium">Repository</p>
                        <a
                          href={formatUrl(project.github_repo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View on GitHub
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-8">
              {[
                { key: 'overview', label: 'Overview', icon: FaProjectDiagram },
                { key: 'team', label: `Team (${teamMembers.length})`, icon: FaUsers },
                { key: 'updates', label: `Updates (${projectUpdates.length})`, icon: FaEdit },
                { key: 'files', label: `Files (${projectFiles.length})`, icon: FaUpload },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-600 text-sm font-medium">Team Members</p>
                      <p className="text-2xl font-bold text-blue-900">{teamMembers.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-600 text-sm font-medium">Updates</p>
                      <p className="text-2xl font-bold text-green-900">{projectUpdates.length}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-purple-600 text-sm font-medium">Files</p>
                      <p className="text-2xl font-bold text-purple-900">{projectFiles.length}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-yellow-600 text-sm font-medium">Avg Rating</p>
                      <p className="text-2xl font-bold text-yellow-900">{Number(project.avg_rating || 0).toFixed(1)}/5.0</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-orange-600 text-sm font-medium">Reviews</p>
                      <p className="text-2xl font-bold text-orange-900">{project.ratings_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                  {canEdit() && (
                    <button className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      <FaPlus className="mr-1" />
                      Add Member
                    </button>
                  )}
                </div>

                {teamMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No team members added yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                            {(member.users?.name || member.email || '?').substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{member.users?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                            <p className="text-xs text-blue-600">{member.role_in_project}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'updates' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Project Updates</h3>
                  {canEdit() && (
                    <button className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      <FaPlus className="mr-1" />
                      Add Update
                    </button>
                  )}
                </div>

                {projectUpdates.length === 0 ? (
                  <div className="text-center py-12">
                    <FaEdit className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No updates posted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectUpdates.map((update) => (
                      <div key={update.id} className="bg-gray-50 p-6 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{update.title}</h4>
                            <p className="text-sm text-gray-600">
                              by {update.users?.name} • {formatDateDDMMYYYY(update.created_at)}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {update.update_type}
                          </span>
                        </div>
                        <p className="text-gray-700">{update.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Project Files</h3>
                  {canEdit() && (
                    <button className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      <FaUpload className="mr-1" />
                      Upload File
                    </button>
                  )}
                </div>

                {projectFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <FaUpload className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{file.file_name}</p>
                            <p className="text-sm text-gray-600">
                              Uploaded by {file.users?.name} • {formatDateDDMMYYYY(file.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                            <FaEye />
                          </button>
                          {canEdit() && (
                            <button className="p-2 text-red-600 hover:bg-red-100 rounded">
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
