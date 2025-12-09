import React from 'react'
import { useTeamMembers } from '../hooks/useTeamMembers'

const TeamMembersTable = () => {
  const { teamMembers, loading, error } = useTeamMembers()

  if (loading) return <div className="text-center py-4">Loading team members...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Project Team Members</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Project ID</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => (
              <tr key={index}>
                <td className="font-semibold">{member.users?.name || 'N/A'}</td>
                <td>{member.users?.email || 'N/A'}</td>
                <td>
                  <span className="badge badge-outline">
                    {member.role}
                  </span>
                </td>
                <td>{member.project_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {teamMembers.length === 0 && (
        <div className="text-center py-4 text-gray-500">No team members found</div>
      )}
    </div>
  )
}

export default TeamMembersTable
