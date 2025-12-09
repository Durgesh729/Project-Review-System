import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useFeedback = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setFeedback(data || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [])

  return { feedback, loading, error }
}
