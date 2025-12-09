import React from 'react'
import { useContacts } from '../hooks/useContacts'

const ContactsTable = () => {
  const { contacts, loading, error } = useContacts()

  if (loading) return <div className="text-center py-4">Loading contacts...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Contact Messages</h2>
      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">{contact.name}</h3>
              <p className="text-sm text-gray-600">Email: {contact.email}</p>
              <p className="mt-2">{contact.message}</p>
              <div className="card-actions justify-end">
                <span className="text-xs text-gray-500">
                  {new Date(contact.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {contacts.length === 0 && (
        <div className="text-center py-4 text-gray-500">No contact messages found</div>
      )}
    </div>
  )
}

export default ContactsTable
