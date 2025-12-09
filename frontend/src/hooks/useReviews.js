import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useReviews = () => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true)
        
        // Try with join first
        const { data: joinedData, error: joinedError } = await supabase
          .from('reviews')
          .select(`
            rating,
            comment,
            created_at,
            users!inner(name, email)
          `)
          .order('created_at', { ascending: false })

        if (joinedError) {
          console.log('Join query failed in useReviews, trying separate queries:', joinedError)
          
          // Fallback: fetch reviews without join
          const { data: simpleData, error: simpleError } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false })

          if (simpleError) {
            setError(simpleError.message)
            return
          }

          // Fetch user data separately
          const userIds = [...new Set(simpleData.map(r => r.user_id))]
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds)

          if (usersError) {
            console.error('Error fetching users in useReviews:', usersError)
          }

          // Create a map of user data
          const usersMap = {}
          if (usersData) {
            usersData.forEach(user => {
              usersMap[user.id] = user
            })
          }

          // Format data to match expected structure
          const formattedData = simpleData.map(review => ({
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            users: usersMap[review.user_id] || { name: "Anonymous", email: "" }
          }))

          setReviews(formattedData || [])
        } else {
          setReviews(joinedData || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [])

  return { reviews, loading, error }
}
