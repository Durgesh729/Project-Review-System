import React from 'react'
import { useProjects } from '../hooks/useProjects'

const ProjectsTable = () => {
  const { projects, loading, error } = useProjects()

  if (loading) return <div className="text-center py-4">Loading projects...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Projects</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Domain</th>
              <th>Mentor</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={index}>
                <td className="font-semibold">{project.title}</td>
                <td>{project.domain}</td>
                <td>{project.mentorName}</td>
                <td>{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}</td>
                <td>
                  <span className={`badge ${project.status === 'completed' ? 'badge-success' : project.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
                    {project.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {projects.length === 0 && (
        <div className="text-center py-4 text-gray-500">No projects found</div>
      )}
    </div>
  )
}

export default ProjectsTable
