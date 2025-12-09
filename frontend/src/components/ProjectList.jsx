import React from 'react';
import { FaProjectDiagram } from 'react-icons/fa';

function ProjectList({ projects, selectedProject, onSelectProject, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400 text-sm text-center px-4">
          No projects assigned to you yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project)}
          className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-105 shadow-lg border-2 ${
            selectedProject?.id === project.id 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 shadow-blue-500/50' 
              : 'bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600 hover:from-gray-600 hover:to-gray-700 hover:border-gray-500 shadow-gray-700/30'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${
              selectedProject?.id === project.id 
                ? 'bg-blue-500/30' 
                : 'bg-gray-600/50'
            }`}>
              <FaProjectDiagram className={`text-lg ${
                selectedProject?.id === project.id 
                  ? 'text-blue-200' 
                  : 'text-blue-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm truncate ${
                selectedProject?.id === project.id 
                  ? 'text-white' 
                  : 'text-gray-200'
              }`}>
                {project.group_id}_{project.project_name}
              </div>
              {project.domain && (
                <div className={`text-xs truncate mt-1 ${
                  selectedProject?.id === project.id 
                    ? 'text-blue-200' 
                    : 'text-gray-400'
                }`}>
                  {project.domain}
                </div>
              )}
            </div>
            {selectedProject?.id === project.id && (
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export default ProjectList;
