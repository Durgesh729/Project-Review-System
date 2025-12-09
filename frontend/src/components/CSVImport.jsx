import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { FaUpload, FaFileCsv, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CSVImport = ({ onImportComplete, coordinatorId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  // Expected CSV columns (with variations)
  const requiredColumns = ['Project Name', 'Mentor Name', 'Mentor Email', 'Mentee Name', 'Mentee Email'];
  const columnVariations = {
    'Project Name': ['project name', 'project_name', 'projectname', 'title', 'project title'],
    'Mentor Name': ['mentor name', 'mentor_name', 'mentorname', 'mentor'],
    'Mentor Email': ['mentor email', 'mentor_email', 'mentoremail', 'mentor email address'],
    'Mentee Name': ['mentee name', 'mentee_name', 'menteename', 'mentee', 'student name'],
    'Mentee Email': ['mentee email', 'mentee_email', 'menteeemail', 'mentee email address', 'student email'],
    'Duration': ['duration', 'project duration', 'timeframe']
  };
  const optionalColumns = ['Project Details', 'Project Status', 'Duration'];

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }
          
          // Convert to object format like PapaParse
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          const result = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      // First, read the file as text to clean it up
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          let csvText = event.target.result;
          
          // Clean up the CSV text
          // 1. Split into lines
          let lines = csvText.split(/\r?\n/);
          
          // 2. Clean up the header row - remove trailing comma if present
          if (lines.length > 0) {
            lines[0] = lines[0].replace(/,\s*$/, '');
          }
          
          // 3. Clean up data rows - ensure they have the same number of columns as headers
          const headerCount = lines[0].split(',').length;
          const cleanedLines = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const columns = line.split(',');
            
            // If the line has more columns than headers, trim the extra columns
            if (columns.length > headerCount) {
              cleanedLines.push(columns.slice(0, headerCount).join(','));
            } else if (columns.length < headerCount) {
              // If the line has fewer columns, pad with empty values
              while (columns.length < headerCount) {
                columns.push('');
              }
              cleanedLines.push(columns.join(','));
            } else {
              cleanedLines.push(line);
            }
          }
          
          // Parse the cleaned CSV text - PRESERVE ORIGINAL HEADERS
          Papa.parse(cleanedLines.join('\n'), {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors && results.errors.length > 0) {
                console.warn('CSV parsing had some issues, but continuing with available data', results.errors);
              }
              
              // Filter out any empty rows
              const filteredData = (results.data || []).filter(row => 
                Object.values(row).some(value => value !== null && value !== undefined && value.toString().trim() !== '')
              );
              
              if (filteredData.length === 0) {
                reject(new Error('No valid data found in the CSV file'));
              } else {
                console.log('Parsed headers:', Object.keys(filteredData[0]));
                resolve(filteredData);
              }
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              reject(new Error(`Failed to parse CSV file: ${error.message}`));
            }
          });
        } catch (error) {
          console.error('Error processing CSV file:', error);
          reject(new Error(`Error processing CSV file: ${error.message}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(new Error('Failed to read the file. Please try again.'));
      };
      
      reader.readAsText(file);
    });
  };

  const validateCSVData = (data) => {
    const errors = [];
    const warnings = [];
    const validRows = [];

    if (!data || data.length === 0) {
      errors.push('CSV file is empty or invalid');
      return { errors, warnings, validRows };
    }

    // Get headers from the first row
    const headers = Object.keys(data[0]);
    const columnMapping = {};
    const missingColumns = [];
    
    console.log('Raw headers from CSV:', headers);
    
    // Clean up headers and create a mapping of lowercase headers to their original case
    const headerMap = {};
    headers.forEach(header => {
      if (header) { // Skip empty headers that might result from trailing commas
        const cleanHeader = header.trim().toLowerCase();
        headerMap[cleanHeader] = header;
        console.log(`Header mapping: '${cleanHeader}' -> '${header}'`);
      }
    });
    
    console.log('Header map:', headerMap);
    console.log('Column variations:', columnVariations);

    // Map expected columns to actual headers with flexible matching
    requiredColumns.forEach(requiredCol => {
      // Try to find the header using variations
      const variations = [
        requiredCol.toLowerCase(),
        requiredCol.toLowerCase().replace(/\s+/g, ''),
        requiredCol.toLowerCase().replace(/\s+/g, '_'),
        ...(columnVariations[requiredCol] || []).map(v => v.toLowerCase())
      ];
      
      console.log(`Looking for '${requiredCol}' with variations:`, variations);
      
      // Also try matching against headers with spaces/underscores removed
      let found = variations.find(variation => headerMap[variation]);
      
      if (!found) {
        // Try fuzzy matching - remove all non-alphanumeric and compare
        found = variations.find(variation => {
          return Object.keys(headerMap).some(headerKey => {
            const cleanHeader = headerKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanHeader === cleanVariation;
          });
        });
        
        if (found) {
          const matchedHeader = Object.keys(headerMap).find(headerKey => {
            const cleanHeader = headerKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanVariation = found.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanHeader === cleanVariation;
          });
          found = matchedHeader;
        }
      }
      
      if (found) {
        columnMapping[requiredCol] = headerMap[found] || found;
        console.log(`✓ Mapped '${requiredCol}' to '${columnMapping[requiredCol]}'`);
      } else {
        console.log(`✗ Could not find '${requiredCol}'. Available headers: ${Object.keys(headerMap).join(', ')}`);
        missingColumns.push(requiredCol);
      }
    });
    
    console.log('Final column mapping:', columnMapping);
    console.log('Missing columns:', missingColumns);
    
    // Check for Duration separately as it's optional
    const durationVariations = [
      'duration',
      ...(columnVariations['Duration'] || []).map(v => v.toLowerCase())
    ];
    
    const foundDuration = durationVariations.find(variation => headerMap[variation]);
    
    if (foundDuration) {
      columnMapping['Duration'] = headerMap[foundDuration];
    }
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`);
      return { errors, warnings, validRows };
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowErrors = [];
      const rowWarnings = [];

      // Check required fields using column mapping
      if (!row[columnMapping['Project Name']]?.trim()) {
        rowErrors.push('Project Name is required');
      }
      if (!row[columnMapping['Mentor Name']]?.trim()) {
        rowErrors.push('Mentor Name is required');
      }
      if (!row[columnMapping['Mentor Email']]?.trim()) {
        rowErrors.push('Mentor Email is required');
      }
      if (!row[columnMapping['Mentee Name']]?.trim()) {
        rowErrors.push('Mentee Name is required');
      }
      if (!row[columnMapping['Mentee Email']]?.trim()) {
        rowErrors.push('Mentee Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (row[columnMapping['Mentor Email']] && !emailRegex.test(row[columnMapping['Mentor Email']].trim())) {
        rowErrors.push('Invalid Mentor Email format');
      }
      if (row[columnMapping['Mentee Email']] && !emailRegex.test(row[columnMapping['Mentee Email']].trim())) {
        rowErrors.push('Invalid Mentee Email format');
      }

      // Check for duplicates within the CSV
      const duplicateProject = data.slice(0, index).some(prevRow => 
        prevRow[columnMapping['Project Name']]?.trim().toLowerCase() === row[columnMapping['Project Name']]?.trim().toLowerCase()
      );
      if (duplicateProject) {
        rowWarnings.push('Duplicate project name in CSV');
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
      } else {
        // Create normalized row with standard column names
        const normalizedRow = {
          'Project Name': row[columnMapping['Project Name']]?.trim(),
          'Mentor Name': row[columnMapping['Mentor Name']]?.trim(),
          'Mentor Email': row[columnMapping['Mentor Email']]?.trim(),
          'Mentee Name': row[columnMapping['Mentee Name']]?.trim(),
          'Mentee Email': row[columnMapping['Mentee Email']]?.trim(),
          'Project Details': row['Project Details'] || row['project details'] || row['project_details'] || '',
          'Project Status': row['Project Status'] || row['project status'] || row['project_status'] || 'pending',
          'Duration': row[columnMapping['Duration']] || '1 Semester',
          rowNumber: index + 1,
          warnings: rowWarnings
        };
        validRows.push(normalizedRow);
      }

      if (rowWarnings.length > 0) {
        warnings.push(`Row ${index + 1}: ${rowWarnings.join(', ')}`);
      }
    });

    return { errors, warnings, validRows };
  };

  // Helper function to create or get user
  const createOrGetUser = async (email, name, role) => {
    try {
      // First, check if user already exists
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (lookupError) {
        console.error(`Error looking up ${role}:`, lookupError);
        throw new Error(`Failed to lookup ${role}: ${lookupError.message}`);
      }

      if (existingUser) {
        console.log(`Found existing ${role}:`, existingUser);
        return existingUser;
      }

      // If user doesn't exist, create them
      console.log(`Creating new ${role}:`, { email, name, role });
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: email.toLowerCase(),
          role: role,
          isVerified: true
        })
        .select('id, name, email')
        .single();

      if (createError) {
        console.error(`Error creating ${role}:`, createError);
        throw new Error(`Failed to create ${role}: ${createError.message}`);
      }

      console.log(`Created new ${role}:`, newUser);
      return newUser;
    } catch (error) {
      console.error(`Error in createOrGetUser for ${role}:`, error);
      throw error;
    }
  };

  const processCSVData = async (validRows) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      createdProjects: [],
      updatedProjects: [],
      assignedMentors: [],
      assignedMentees: [],
      createdMentors: [],
      createdMentees: []
    };

    for (const row of validRows) {
      try {
        setUploadProgress(prev => prev + (100 / validRows.length));

        // 1. Check if project already exists
        const { data: existingProject, error: projectCheckError } = await supabase
          .from('projects')
          .select('id, project_name, mentor_id, mentees')
          .eq('project_name', row['Project Name'])
          .eq('assigned_by', coordinatorId)
          .maybeSingle();

        if (projectCheckError) {
          throw new Error(`Failed to check existing project: ${projectCheckError.message}`);
        }

        // 2. Create or get mentor
        let mentorProfile;
        try {
          mentorProfile = await createOrGetUser(
            row['Mentor Email'],
            row['Mentor Name'],
            'mentor'
          );
          results.assignedMentors.push({
            projectId: existingProject?.id,
            mentor: mentorProfile,
            row: row.rowNumber
          });
        } catch (error) {
          console.warn(`Failed to create/get mentor: ${error.message}`);
          results.errors.push(`Row ${row.rowNumber}: ${error.message}`);
          results.failed++;
          continue;
        }

        // 3. Create or get mentee
        let menteeProfile;
        try {
          menteeProfile = await createOrGetUser(
            row['Mentee Email'],
            row['Mentee Name'],
            'mentee'
          );
          results.assignedMentees.push({
            projectId: existingProject?.id,
            mentee: menteeProfile,
            row: row.rowNumber
          });
        } catch (error) {
          console.warn(`Failed to create/get mentee: ${error.message}`);
          results.errors.push(`Row ${row.rowNumber}: ${error.message}`);
          results.failed++;
          continue;
        }

        let projectId;
        if (existingProject) {
          // Update existing project
          const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update({
              project_name: row['Project Name'],
              project_details: row['Project Details'] || 'Imported from CSV',
              mentor_id: mentorProfile?.id || null,
              mentor_email: row['Mentor Email'].toLowerCase(),
              mentees: [menteeProfile.id],
              assigned_by: coordinatorId
            })
            .eq('id', existingProject.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Failed to update project: ${updateError.message}`);
          }

          projectId = updatedProject.id;
          results.updatedProjects.push(updatedProject);
        } else {
          // Create new project
          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert({
              project_name: row['Project Name'],
              project_details: row['Project Details'] || 'Imported from CSV',
              mentor_id: mentorProfile?.id || null,
              mentor_email: row['Mentor Email'].toLowerCase(),
              mentees: [menteeProfile.id],
              assigned_by: coordinatorId
            })
            .select()
            .single();

          if (createError) {
            throw new Error(`Failed to create project: ${createError.message}`);
          }

          projectId = newProject.id;
          results.createdProjects.push(newProject);
        }

        // 5. Create project assignment record
        const { error: assignmentError } = await supabase
          .from('project_assignments')
          .upsert({
            project_id: projectId,
            project_name: row['Project Name'],
            mentor_id: mentorProfile?.id || null,
            mentor_name: row['Mentor Name'],
            mentor_email: row['Mentor Email'].toLowerCase(),
            created_by: coordinatorId,
            status: row['Project Status'] || 'pending',
            duration: normalizeDuration(row['Duration'])
          });

        if (assignmentError) {
          console.warn(`Failed to create assignment record: ${assignmentError.message}`);
        }

        // 6. Create mentee assignment record
        if (menteeProfile && projectId) {
          const { error: menteeAssignmentError } = await supabase
            .from('project_assignment_mentees')
            .upsert({
              project_id: projectId,
              mentee_id: menteeProfile.id,
              mentee_name: row['Mentee Name'],
              mentee_email: row['Mentee Email'].toLowerCase()
            });

          if (menteeAssignmentError) {
            console.warn(`Failed to create mentee assignment: ${menteeAssignmentError.message}`);
          }
        }

        results.success++;

      } catch (error) {
        console.error(`Error processing row ${row.rowNumber}:`, error);
        results.errors.push(`Row ${row.rowNumber}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.type === 'application/vnd.ms-excel' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.name.toLowerCase().endsWith('.xlsx') ||
                   file.name.toLowerCase().endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setImportResults(null);

    try {
      console.log(`Parsing ${isCSV ? 'CSV' : 'Excel'} file:`, file.name);
      
      // Parse file based on type
      const data = isCSV ? await parseCSVFile(file) : await parseExcelFile(file);
      
      console.log('File parsed successfully:', data);
      console.log('Number of rows parsed:', data.length);
      
      // Validate data
      const validation = validateCSVData(data);
      console.log('Validation result:', validation);
      console.log('Validation errors:', validation.errors);
      console.log('Validation warnings:', validation.warnings);
      console.log('Valid rows:', validation.validRows.length);
      
      if (validation.errors.length > 0) {
        console.error('CSV validation failed with errors:', validation.errors);
        setImportResults({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        });
        setIsUploading(false);
        return;
      }

      // Process valid data
      console.log('Starting to process', validation.validRows.length, 'valid rows');
      const processResults = await processCSVData(validation.validRows);
      console.log('Processing complete:', processResults);
      
      setImportResults({
        success: true,
        ...processResults,
        warnings: validation.warnings
      });

      // Show success message
      if (processResults.success > 0) {
        toast.success(`Successfully imported ${processResults.success} projects!`);
      }
      
      if (processResults.failed > 0) {
        toast.error(`${processResults.failed} projects failed to import`);
      }

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(processResults);
      }

    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process ${isCSV ? 'CSV' : 'Excel'} file: ${error.message}`);
      setImportResults({
        success: false,
        errors: [`Processing error: ${error.message}`]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Project Name': 'E-commerce Website',
        'Mentor Name': 'Dr. Rajesh Kumar',
        'Mentor Email': 'rajesh.kumar@git-india.edu.in',
        'Mentee Name': 'Priya Sharma',
        'Mentee Email': 'priya.sharma@git-india.edu.in',
        'Project Details': 'Development of a full-stack e-commerce platform with payment integration',
        'Project Status': 'pending',
        'Duration': '2 Semesters'
      },
      {
        'Project Name': 'AI Chatbot',
        'Mentor Name': 'Dr. Meera Patel',
        'Mentor Email': 'meera.patel@git-india.edu.in',
        'Mentee Name': 'Amit Verma',
        'Mentee Email': 'amit.verma@git-india.edu.in',
        'Project Details': 'Building an intelligent chatbot using NLP and machine learning',
        'Project Status': 'active',
        'Duration': '3 Semesters'
      },
      {
        'Project Name': 'Smart Attendance System',
        'Mentor Name': 'Dr. Sanjay Gupta',
        'Mentor Email': 'sanjay.gupta@git-india.edu.in',
        'Mentee Name': 'Neha Singh',
        'Mentee Email': 'neha.singh@git-india.edu.in',
        'Project Details': 'RFID and facial recognition based attendance system',
        'Project Status': 'pending',
        'Duration': '1 Semester'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setImportResults(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Import Projects from CSV</h2>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <FaFileCsv /> Download Template
        </button>
      </div>

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-4">
            <FaSpinner className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">Processing CSV...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{Math.round(uploadProgress)}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">Upload CSV or Excel file</p>
              <p className="text-sm text-gray-600 mt-1">
                Click to browse or drag and drop your file here (.csv, .xlsx, .xls)
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FaUpload /> Choose File
            </button>
          </div>
        )}
      </div>

      {/* Required Columns Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Required Columns (case-insensitive):</h3>
        <div className="space-y-2">
          {requiredColumns.map((column) => (
            <div key={column} className="flex flex-wrap gap-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                {column}
              </span>
              <span className="text-xs text-blue-600">or</span>
              <div className="flex flex-wrap gap-1">
                {columnVariations[column].slice(0, 3).map((variation) => (
                  <span key={variation} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                    {variation}
                  </span>
                ))}
                {columnVariations[column].length > 3 && (
                  <span className="text-xs text-blue-500">+{columnVariations[column].length - 3} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">
          Optional: {optionalColumns.join(', ')}
        </p>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6">
          <div className={`p-4 rounded-lg ${
            importResults.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {importResults.success ? (
                  <FaCheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  importResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResults.success ? 'Import Completed' : 'Import Failed'}
                </h3>
                
                {importResults.success && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>✅ Successfully processed: {importResults.success} projects</p>
                    {importResults.createdProjects.length > 0 && (
                      <p>📝 Created: {importResults.createdProjects.length} new projects</p>
                    )}
                    {importResults.updatedProjects.length > 0 && (
                      <p>🔄 Updated: {importResults.updatedProjects.length} existing projects</p>
                    )}
                    {importResults.assignedMentors.length > 0 && (
                      <p>👨‍🏫 Assigned: {importResults.assignedMentors.length} mentors</p>
                    )}
                    {importResults.assignedMentees.length > 0 && (
                      <p>👨‍🎓 Assigned: {importResults.assignedMentees.length} mentees</p>
                    )}
                    {importResults.failed > 0 && (
                      <p className="text-orange-600">⚠️ Failed: {importResults.failed} projects</p>
                    )}
                  </div>
                )}

                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800">Errors:</p>
                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside space-y-1">
                      {importResults.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li>... and {importResults.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}

                {importResults.warnings && importResults.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                      {importResults.warnings.slice(0, 3).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                      {importResults.warnings.length > 3 && (
                        <li>... and {importResults.warnings.length - 3} more warnings</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={resetImport}
                    className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                  >
                    Import Another File
                  </button>
                  {importResults.success && (
                    <button
                      onClick={() => window.location.reload()}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Refresh Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to normalize duration input
const normalizeDuration = (duration) => {
  if (!duration) return '1 Semester';
  
  const lowerDuration = String(duration).toLowerCase().trim();
  if (lowerDuration.includes('1') || lowerDuration.includes('one') || lowerDuration.includes('single') || lowerDuration.includes('6 month')) {
    return '1 Semester';
  } else if (lowerDuration.includes('2') || lowerDuration.includes('two') || lowerDuration.includes('12 month') || lowerDuration.includes('1 year')) {
    return '2 Semesters';
  } else if (lowerDuration.includes('3') || lowerDuration.includes('three') || lowerDuration.includes('1.5') || lowerDuration.includes('18 month') || lowerDuration.includes('1.5 year')) {
    return '3 Semesters';
  }
  return '1 Semester';
};

export default CSVImport;