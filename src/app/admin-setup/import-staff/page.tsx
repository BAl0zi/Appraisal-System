'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { bulkImportUsers, ImportResult } from '@/app/actions/bulk-import-actions'

export default function ImportStaffPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [replaceExisting, setReplaceExisting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setResults([])
    setError(null)

    if (selectedFile) {
      setFile(selectedFile)
      readExcel(selectedFile)
    }
  }

  const readExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const bstr = e.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      setPreviewData(data)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (previewData.length === 0) return

    setLoading(true)
    setError(null)
    
    // Sanitize data to ensure plain objects for Server Action
    const sanitizedData = JSON.parse(JSON.stringify(previewData));

    try {
      const res = await bulkImportUsers(sanitizedData, replaceExisting)
      setResults(res)
    } catch (err: any) {
      setError('Import failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadResults = () => {
    if (results.length === 0) return

    // Create CSV content including passwords
    const headers = ['Email', 'Full Name', 'Password', 'Status', 'Message']
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        r.email,
        `"${r.fullName}"`, // Quote full name to handle spaces
        r.password || '',
        r.status,
        `"${r.message}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'import_results.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">Bulk Import Staff</h1>
      
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8 border border-white/20">
        <h2 className="text-xl font-semibold mb-4 text-purple-200">1. Upload Excel File</h2>
        <p className="mb-4 text-purple-100 text-sm">
          Excel file must contain headers: <strong>Full Name, Email, Role, Job Category</strong>. <br/>
          Optional: <strong>Additional Roles</strong>
        </p>
        
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-200
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-purple-50 file:text-purple-700
            hover:file:bg-purple-100
          "
        />
        <div className="mt-4 flex items-center">
            <input
                id="replace-existing"
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <label htmlFor="replace-existing" className="ml-2 text-sm font-medium text-gray-300">
                Replace existing users (Delete and Re-create)
            </label>
        </div>
      </div>

      {previewData.length > 0 && results.length === 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8 border border-white/20">
          <div className="flexjustify-between items-center mb-4">
             <h2 className="text-xl font-semibold text-purple-200">2. Preview Data ({previewData.length} records)</h2>
          </div>
         
          <div className="overflow-x-auto max-h-60 mb-6">
            <table className="min-w-full text-sm text-left text-gray-200">
              <thead className="text-xs text-purple-200 uppercase bg-white/5 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Full Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Job Category</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row: any, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-4 py-2">{row['Full Name']}</td>
                    <td className="px-4 py-2">{row['Email']}</td>
                    <td className="px-4 py-2">{row['Role']}</td>
                    <td className="px-4 py-2">{row['Job Category']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <p className="text-center text-gray-400 mt-2">...and {previewData.length - 10} more</p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Start Import'}
          </button>
          
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8 border border-white/20">
           <h2 className="text-xl font-semibold mb-4 text-green-300">3. Import Completed</h2>
           
           <div className="flex gap-4 mb-4">
             <button
                onClick={downloadResults}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
             >
               Download Credentials (CSV)
             </button>
             <button
                onClick={() => router.push('/dashboard?tab=users')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
             >
               Complete & Go to Management
             </button>
             <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium hidden"
             >
               Import More
             </button>
           </div>

           <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm text-left text-gray-200">
              <thead className="text-xs text-purple-200 uppercase bg-white/5 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Password</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className={`border-b border-white/10 ${row.status === 'success' ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2 font-mono">{row.password || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${row.status === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
