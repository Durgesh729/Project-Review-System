import React from 'react'
import { useFeedback } from '../hooks/useFeedback'
import { formatDateDDMMYYYY } from '../utils/dateUtils'

const FeedbackTable = () => {
  const { feedback, loading, error } = useFeedback()

  if (loading) return <div className="text-center py-4">Loading feedback...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Feedback</h2>
      <div className="space-y-4">
        {feedback.map((item, index) => (
          <div key={index} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">{item.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-600">Context: {item.context || 'General'}</p>
              <p className="mt-2">{item.message}</p>
              <div className="card-actions justify-end">
                <span className="text-xs text-gray-500">
                  {formatDateDDMMYYYY(item.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {feedback.length === 0 && (
        <div className="text-center py-4 text-gray-500">No feedback found</div>
      )}
    </div>
  )
}

export default FeedbackTable
