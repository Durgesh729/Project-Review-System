import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useProjects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select('title, domain, mentorName, deadline, status')
          .order('createdAt', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setProjects(data || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return { projects, loading, error }
}
