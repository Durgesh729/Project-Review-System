import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function AddProjectForm({ onProjectCreated, onCancel }) {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    description: '',
    mentorName: '',
    mentorEmail: '',
    deadline: '',
    githubRepo: '',
    demoLink: '',
    duration: '2 Semesters',
    teamMembers: [],
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  // Input handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: '', email: '', role: 'Developer' }],
    }));
  };

  const handleTeamMemberChange = (index, field, value) => {
    const updated = [...formData.teamMembers];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, teamMembers: updated }));
  };

  const handleRemoveTeamMember = (index) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Check authentication first
    if (!isAuthenticated || !user) {
      setMessage({ type: 'error', text: 'User not authenticated. Please log in first.' });
      return;
    }

    if (!formData.title || !formData.domain || !formData.mentorName || !formData.mentorEmail) {
      setMessage({ type: 'error', text: 'Please fill all required fields (Title, Domain, Mentor Name, Mentor Email).' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.mentorEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid mentor email address.' });
      return;
    }

    setMessage({ type: 'info', text: 'Creating project...' });

    try {
      // Check if mentor exists, if not create a mentor user
      let mentorData;
      const { data: existingMentor, error: mentorError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('email', formData.mentorEmail.trim())
        .single();

      if (mentorError && mentorError.code === 'PGRST116') {
        // Mentor doesn't exist, create new mentor user
        const { data: newMentor, error: createError } = await supabase
          .from('users')
          .insert({
            full_name: formData.mentorName.trim(),
            email: formData.mentorEmail.trim(),
            role: 'mentor',
            is_verified: true
          })
          .select()
          .single();

        if (createError) {
          setMessage({ type: 'error', text: 'Failed to create mentor. Please try again.' });
          return;
        }
        mentorData = newMentor;
      } else if (mentorError) {
        setMessage({ type: 'error', text: 'Error checking mentor. Please try again.' });
        return;
      } else {
        mentorData = existingMentor;
      }

      // Prepare project data
      const projectPayload = {
        title: formData.title.trim(),
        domain: formData.domain.trim(),
        description: formData.description.trim(),
        deadline: formData.deadline || null,
        github_repo: formData.githubRepo.trim() || null,
        demo_link: formData.demoLink.trim() || null,
        mentor_id: mentorData.id,
        mentor_email: mentorData.email,
        created_by: user.id,
        status: 'active',
        duration_months: formData.duration === '1 Semester' ? 6 : (formData.duration === '2 Semesters' ? 12 : (formData.duration === '3 Semesters' ? 18 : 24)),
        created_at: new Date().toISOString(),
      };

      console.log('Creating project with data:', projectPayload);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([projectPayload])
        .select(`
          *,
          creator:created_by (
            full_name,
            email
          ),
          mentor:mentor_id (
            full_name,
            email
          )
        `)
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        // Provide more user-friendly error message
        if (projectError.code === '23505') {
          throw new Error('A project with these details already exists.');
        } else if (projectError.code === '42501') {
          throw new Error('You do not have permission to create projects.');
        } else {
          throw projectError;
        }
      }

      if (!projectData) {
        throw new Error('Failed to create project. Please try again.');
      }

      console.log('Project created successfully:', projectData);

      // Process team members if any
      if (formData.teamMembers.length > 0) {
        console.log('Processing team members:', formData.teamMembers);
        const errors = [];

        // Process team members one by one to handle errors individually
        for (const member of formData.teamMembers) {
          if (!member.email || !member.name) {
            console.warn('Skipping team member: missing email or name');
            continue;
          }

          try {
            // 1. Check if user exists
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', member.email.trim())
              .single();

            let userId = existingUser?.id;

            // 2. If user doesn't exist, create them
            if (!userId) {
              console.log(`Creating new user for team member: ${member.email}`);
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  full_name: member.name.trim(),
                  email: member.email.trim(),
                  role: 'mentee',
                  is_verified: true
                })
                .select('id')
                .single();

              if (createError) throw createError;
              userId = newUser.id;
            }

            // 3. Add user to project_team_members
            const { error: teamError } = await supabase
              .from('project_team_members')
              .insert({
                project_id: projectData.id,
                user_id: userId,
                email: member.email.trim(),
                role: member.role || 'member'
              });

            if (teamError) throw teamError;

            console.log(`Added team member: ${member.email} (${member.role})`);

          } catch (error) {
            console.error(`Error adding team member ${member.email}:`, error);
            errors.push(`Failed to add ${member.email}: ${error.message}`);
          }
        }

        // Show warning if any team members couldn't be added
        if (errors.length > 0) {
          setMessage({
            type: 'warning',
            text: `Project created, but some team members couldn't be added: ${errors.join('; ')}`
          });
        }
      }

      setMessage({ type: 'success', text: '✅ Project created successfully!' });
      if (onProjectCreated) onProjectCreated();

      setTimeout(() => {
        setFormData({
          title: '',
          domain: '',
          description: '',
          mentorName: '',
          mentorEmail: '',
          deadline: '',
          githubRepo: '',
          demoLink: '',
          teamMembers: [],
        });
      }, 1000);
    } catch (error) {
      console.error('Project creation failed:', error);
      const errorMessage = error.message || 'Failed to create project. Please try again.';
      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>

      {message.text && (
        <div
          className={`mb-4 p-3 rounded text-white ${message.type === 'error'
            ? 'bg-red-500'
            : message.type === 'info'
              ? 'bg-blue-500'
              : 'bg-green-500'
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Project Title */}
      <label className="block text-white mb-2">Title *</label>
      <input
        type="text"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="Project title"
      />

      {/* Domain */}
      <label className="block text-white mb-2">Domain *</label>
      <select
        value={formData.domain}
        onChange={(e) => handleInputChange('domain', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
      >
        <option value="">Select Domain</option>
        <option value="Web Development">Web Development</option>
        <option value="AI">Artificial Intelligence</option>
        <option value="ML">Machine Learning</option>
        <option value="Mobile App">Mobile App</option>
        <option value="Cloud">Cloud Computing</option>
        <option value="Other">Other</option>
      </select>

      {/* Description */}
      <label className="block text-white mb-2">Description</label>
      <textarea
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="Project description"
        rows="3"
      />

      {/* Deadline */}
      <label className="block text-white mb-2">Project Deadline</label>
      <input
        type="date"
        value={formData.deadline}
        onChange={(e) => handleInputChange('deadline', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
      />

      {/* GitHub Repository */}
      <label className="block text-white mb-2">GitHub Repository (Optional)</label>
      <input
        type="url"
        value={formData.githubRepo}
        onChange={(e) => handleInputChange('githubRepo', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="https://github.com/username/repository"
      />

      {/* Duration */}
      <div className="md:col-span-1">
        <label className="block text-white mb-2">
          Project Duration *
        </label>
        <select
          value={formData.duration}
          onChange={(e) => handleInputChange('duration', e.target.value)}
          className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
          required
        >
          <option value="">Select Duration</option>
          <option value="1 Semester">1 Semester (6 months)</option>
          <option value="2 Semesters">2 Semesters (12 months)</option>
          <option value="3 Semesters">3 Semesters (18 months)</option>
          <option value="4 Semesters">4 Semesters (24 months)</option>
        </select>
      </div>

      {/* Demo Link */}
      <label className="block text-white mb-2">Demo Link (Optional)</label>
      <input
        type="url"
        value={formData.demoLink}
        onChange={(e) => handleInputChange('demoLink', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="https://your-demo-link.com"
      />

      {/* Mentor Name */}
      <label className="block text-white mb-2">Mentor Name *</label>
      <input
        type="text"
        value={formData.mentorName}
        onChange={(e) => handleInputChange('mentorName', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="Enter mentor's full name"
      />

      {/* Mentor Email */}
      <label className="block text-white mb-2">Mentor Email *</label>
      <input
        type="email"
        value={formData.mentorEmail}
        onChange={(e) => handleInputChange('mentorEmail', e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
        placeholder="mentor@example.com"
      />

      {/* Team Members */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-white">Team Members</label>
          <button
            onClick={handleAddTeamMember}
            type="button"
            className="bg-green-600 px-3 py-1 rounded-md text-white"
          >
            + Add
          </button>
        </div>

        {formData.teamMembers.map((member, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={member.name}
              onChange={(e) => handleTeamMemberChange(i, 'name', e.target.value)}
              className="flex-1 p-2 rounded bg-gray-700 text-white"
              placeholder="Team member name"
            />
            <input
              type="email"
              value={member.email}
              onChange={(e) => handleTeamMemberChange(i, 'email', e.target.value)}
              className="flex-1 p-2 rounded bg-gray-700 text-white"
              placeholder="member@example.com"
            />
            <select
              value={member.role}
              onChange={(e) => handleTeamMemberChange(i, 'role', e.target.value)}
              className="p-2 rounded bg-gray-700 text-white"
            >
              <option value="Leader">Leader</option>
              <option value="Developer">Developer</option>
              <option value="Designer">Designer</option>
              <option value="Tester">Tester</option>
            </select>
            <button
              type="button"
              onClick={() => handleRemoveTeamMember(i)}
              className="bg-red-600 px-3 text-white rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-600 px-5 py-2 text-white rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-600 px-5 py-2 text-white rounded-md"
        >
          Create Project
        </button>
      </div>
    </div>
  );
}

export default AddProjectForm;

