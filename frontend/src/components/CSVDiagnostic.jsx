import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

const CSVDiagnostic = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = Object.keys(results.data[0] || {});
          
          const info = {
            totalRows: results.data.length,
            headers: headers,
            headerDetails: headers.map((h, idx) => ({
              index: idx,
              name: h,
              length: h.length,
              trimmed: h.trim(),
              lowercase: h.toLowerCase(),
              hasSpaces: h.includes(' '),
              hasSpecialChars: /[^a-zA-Z0-9\s]/.test(h)
            })),
            firstRow: results.data[0],
            errors: results.errors
          };
          
          setDiagnosticInfo(info);
          console.log('CSV Diagnostic Info:', info);
        }
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">CSV Diagnostic Tool</h2>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Upload CSV to Diagnose
      </button>

      {diagnosticInfo && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">File Info</h3>
            <p>Total Rows: {diagnosticInfo.totalRows}</p>
            <p>Headers Found: {diagnosticInfo.headers.length}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">Header Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Index</th>
                    <th className="border p-2">Header Name</th>
                    <th className="border p-2">Length</th>
                    <th className="border p-2">Trimmed</th>
                    <th className="border p-2">Lowercase</th>
                    <th className="border p-2">Has Spaces</th>
                    <th className="border p-2">Special Chars</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticInfo.headerDetails.map((h) => (
                    <tr key={h.index} className="border">
                      <td className="border p-2">{h.index}</td>
                      <td className="border p-2 font-mono">"{h.name}"</td>
                      <td className="border p-2">{h.length}</td>
                      <td className="border p-2 font-mono">"{h.trimmed}"</td>
                      <td className="border p-2 font-mono">{h.lowercase}</td>
                      <td className="border p-2">{h.hasSpaces ? '✓' : '✗'}</td>
                      <td className="border p-2">{h.hasSpecialChars ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">First Row Data</h3>
            <pre className="bg-white p-2 rounded overflow-x-auto text-xs">
              {JSON.stringify(diagnosticInfo.firstRow, null, 2)}
            </pre>
          </div>

          {diagnosticInfo.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded">
              <h3 className="font-bold mb-2 text-red-800">Parsing Errors</h3>
              <pre className="text-xs text-red-700">
                {JSON.stringify(diagnosticInfo.errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVDiagnostic;
