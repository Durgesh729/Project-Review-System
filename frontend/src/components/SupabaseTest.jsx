import React from 'react'
import { supabase } from '../lib/supabase'

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = React.useState('Checking...')
  const [tables, setTables] = React.useState([])

  React.useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error } = await supabase
          .from('projects')
          .select('count')
          .limit(1)

        if (error) {
          setConnectionStatus(`❌ Connection Error: ${error.message}`)
        } else {
          setConnectionStatus('✅ Connected to Supabase successfully!')

          // Try to list available tables
          const { data: tablesData, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(10)

          if (!tablesError && tablesData) {
            setTables(tablesData.map(t => t.table_name))
          }
        }
      } catch (err) {
        setConnectionStatus(`❌ Connection Failed: ${err.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      <div className={`p-3 rounded-lg mb-4 ${connectionStatus.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {connectionStatus}
      </div>

      {tables.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Available Tables:</h3>
          <ul className="list-disc list-inside">
            {tables.map((table, index) => (
              <li key={index} className="text-sm">{table}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Frontend:</strong> https://pms-2025-cmk.vercel.app</p>
        <p><strong>Backend:</strong> https://pms2025-cmk.onrender.com</p>
      </div>
    </div>
  )
}

export default SupabaseTest
