import React from 'react'
import { useReviews } from '../hooks/useReviews'
import { formatDateDDMMYYYY } from '../utils/dateUtils'

const ReviewsTable = () => {
  const { reviews, loading, error } = useReviews()

  if (loading) return <div className="text-center py-4">Loading reviews...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Project Reviews</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review, index) => (
              <tr key={index}>
                <td className="font-semibold">{review.users?.name || 'Anonymous'}</td>
                <td>
                  <div className="flex items-center">
                    <span className="mr-1">⭐</span>
                    <span className="font-bold">{review.rating}/5</span>
                  </div>
                </td>
                <td className="max-w-xs truncate">{review.comment || 'No comment'}</td>
                <td>{formatDateDDMMYYYY(review.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reviews.length === 0 && (
        <div className="text-center py-4 text-gray-500">No reviews found</div>
      )}
    </div>
  )
}

export default ReviewsTable
