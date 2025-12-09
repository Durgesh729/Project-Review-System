import React from 'react'
import ProjectsTable from './ProjectsTable'
import TeamMembersTable from './TeamMembersTable'
import ReviewsTable from './ReviewsTable'
import FeedbackTable from './FeedbackTable'
import ContactsTable from './ContactsTable'

const DataDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Supabase Data Dashboard</h1>
        <p className="text-gray-600">Real-time data from your Supabase database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card bg-base-100 shadow-xl">
          <ProjectsTable />
        </div>

        <div className="card bg-base-100 shadow-xl">
          <TeamMembersTable />
        </div>

        <div className="card bg-base-100 shadow-xl">
          <ReviewsTable />
        </div>

        <div className="card bg-base-100 shadow-xl">
          <FeedbackTable />
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <ContactsTable />
      </div>
    </div>
  )
}

export default DataDashboard
