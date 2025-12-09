import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DASHBOARD_PATHS = {
  mentee: '/components/dashboard/mentee',
  mentor: '/components/dashboard/mentor',
  hod: '/components/dashboard/hod',
  project_coordinator: '/components/dashboard/coordinator',
};

function RoleSwitcher({ className }) {
  const { userProfile, activeRole, updateActiveRole } = useAuth();
  const navigate = useNavigate();

  if (
    !userProfile ||
    !Array.isArray(userProfile.roles) ||
    userProfile.roles.length <= 1 ||
    (userProfile.roles.length === 1 && userProfile.roles[0] === 'mentee')
  ) {
    return null;
  }

  const displayRoles = userProfile.roles.filter((role) => role && role !== 'mentee');
  if (displayRoles.length === 0) {
    return null;
  }

  const handleRoleChange = (event) => {
    const newRole = event.target.value;
    if (!newRole || newRole === activeRole) {
      return;
    }

    try {
      updateActiveRole(newRole);
      const dashboardPath = DASHBOARD_PATHS[newRole] || DASHBOARD_PATHS.mentee;
      navigate(dashboardPath, { replace: true });
      console.log(`Role switched to ${newRole}, redirected to ${dashboardPath}`);
    } catch (error) {
      console.error('Error switching roles:', error);
    }
  };

  return (
    <div className={`relative text-left ${className || 'inline-block'}`}>
      <select
        value={activeRole || (displayRoles.length > 0 ? displayRoles[0] : '')}
        onChange={handleRoleChange}
        className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        <option value="" disabled>
          Switch Role
        </option>
        {displayRoles.map((role) => (
          <option key={role} value={role}>
            {role === 'project_coordinator' ? 'Coordinator' : role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
}

export default RoleSwitcher;

