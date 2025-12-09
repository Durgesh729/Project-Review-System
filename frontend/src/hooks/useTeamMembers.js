import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('project_team_members')
          .select(`
            *,
            users!inner(name, email)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setTeamMembers(data || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [])

  return { teamMembers, loading, error }
}
