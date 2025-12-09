import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useContacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setContacts(data || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [])

  return { contacts, loading, error }
}
