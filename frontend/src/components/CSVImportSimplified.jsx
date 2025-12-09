import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { FaUpload, FaFileCsv, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CSVImportSimplified = ({ onImportComplete, coordinatorId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  };

  const preCreateUsers = async (rows) => {
    try {
      const roleTag = new Map();
      const payload = new Map();
      rows.forEach((r) => {
        const mentorEmail = (r.mentorEmail || '').trim().toLowerCase();
        const menteeEmail = (r.menteeEmail || '').trim().toLowerCase();
        const mentorName = (r.mentorName || '').trim();
        const menteeName = (r.menteeName || '').trim();
        if (mentorEmail) {
          roleTag.set(`mentor:${mentorEmail}`, true);
          payload.set(`mentor:${mentorEmail}`, { email: mentorEmail, name: mentorName || mentorEmail.split('@')[0], role: 'mentor' });
        }
        if (menteeEmail) {
          roleTag.set(`mentee:${menteeEmail}`, true);
          payload.set(`mentee:${menteeEmail}`, { email: menteeEmail, name: menteeName || menteeEmail.split('@')[0], role: 'mentee' });
        }
      });
      const body = { users: Array.from(payload.values()) };
      if (body.users.length === 0) return { mentorProfiles: new Map(), menteeProfiles: new Map(), created: 0, errors: [] };
      const { data, error } = await supabase.functions.invoke('bulk-create-users', { body });
      if (error) return { mentorProfiles: new Map(), menteeProfiles: new Map(), created: 0, errors: [error.message] };
      const map = (data && data.map) ? data.map : {};
      const mentorProfiles = new Map();
      const menteeProfiles = new Map();
      Object.keys(map).forEach((email) => {
        const p = map[email];
        const prof = { id: p.id, email: p.email, name: p.name };
        if (roleTag.has(`mentor:${email.toLowerCase()}`)) mentorProfiles.set(email.toLowerCase(), prof);
        if (roleTag.has(`mentee:${email.toLowerCase()}`)) menteeProfiles.set(email.toLowerCase(), prof);
      });
      const created = Array.isArray(data?.created) ? data.created.length : 0;
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      return { mentorProfiles, menteeProfiles, created, errors };
    } catch (e) {
      return { mentorProfiles: new Map(), menteeProfiles: new Map(), created: 0, errors: [e.message] };
    }
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const findColumnValue = (row, columnNames) => {
    const rowKeys = Object.keys(row);

    for (const colName of columnNames) {
      // Strategy 1: Exact match
      if (row[colName]) {
        return row[colName].toString().trim();
      }

      // Strategy 2: Case-insensitive exact match
      const exactMatch = rowKeys.find(key => key.toLowerCase() === colName.toLowerCase());
      if (exactMatch && row[exactMatch]) {
        return row[exactMatch].toString().trim();
      }

      // Strategy 3: Match without spaces
      const noSpaceMatch = rowKeys.find(key =>
        key.toLowerCase().replace(/\s+/g, '') === colName.toLowerCase().replace(/\s+/g, '')
      );
      if (noSpaceMatch && row[noSpaceMatch]) {
        return row[noSpaceMatch].toString().trim();
      }

      // Strategy 4: Match with underscores
      const underscoreMatch = rowKeys.find(key =>
        key.toLowerCase().replace(/\s+/g, '_') === colName.toLowerCase().replace(/\s+/g, '_')
      );
      if (underscoreMatch && row[underscoreMatch]) {
        return row[underscoreMatch].toString().trim();
      }

      // Strategy 5: Fuzzy matching - remove all non-alphanumeric
      const fuzzyMatch = rowKeys.find(key => {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCol = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanKey === cleanCol && cleanKey.length > 0;
      });
      if (fuzzyMatch && row[fuzzyMatch]) {
        return row[fuzzyMatch].toString().trim();
      }
    }

    console.warn(`Could not find column matching any of: ${columnNames.join(', ')}. Available columns: ${rowKeys.join(', ')}`);
    return '';
  };

  const isEmptyish = (val) => {
    if (val === null || val === undefined) return true;
    const s = String(val).trim();
    return s === '' || s === '-' || s === '—' || s === '_' || s.toLowerCase() === 'na' || s.toLowerCase() === 'n/a';
  };

  const validateAndNormalizeData = (data) => {
    const errors = [];
    const warnings = [];
    const validRows = [];

    if (!data || data.length === 0) {
      errors.push('CSV file is empty');
      return { errors, warnings, validRows };
    }

    console.log('Starting CSV validation...');
    console.log('Total rows to validate:', data.length);
    console.log('Available columns in first row:', Object.keys(data[0]));

    data.forEach((row, index) => {
      const rowNumber = index + 1;
      const rowErrors = [];

      const projectName = findColumnValue(row, ['Project Name', 'project name', 'project_name']);
      const mentorName = findColumnValue(row, ['Mentor Name', 'mentor name', 'mentor_name']);
      const mentorEmail = findColumnValue(row, ['Mentor Email', 'mentor email', 'mentor_email']);
      const durationRaw = findColumnValue(row, ['Duration', 'duration']);
      let menteeName = findColumnValue(row, ['Mentee Name', 'mentee name', 'mentee_name']);
      let menteeEmail = findColumnValue(row, ['Mentee Email', 'mentee email', 'mentee_email']);

      if (!projectName) rowErrors.push('Project Name is required');
      if (!mentorName) rowErrors.push('Mentor Name is required');
      if (!mentorEmail) rowErrors.push('Mentor Email is required');
      // Mentee Email is optional; warn if absent and continue
      if (isEmptyish(menteeEmail)) {
        warnings.push(`Row ${rowNumber}: No Mentee Email provided. Project will be imported without a mentee.`);
        menteeEmail = '';
      }
      // If mentee name missing but email present, derive from email
      if (isEmptyish(menteeName) && !isEmptyish(menteeEmail)) {
        menteeName = menteeEmail.split('@')[0];
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (mentorEmail && !emailRegex.test(mentorEmail)) {
        rowErrors.push('Invalid Mentor Email format');
      }
      if (menteeEmail && !emailRegex.test(menteeEmail)) {
        rowErrors.push('Invalid Mentee Email format');
      }

      if (rowErrors.length > 0) {
        console.warn(`Row ${rowNumber} validation failed:`, rowErrors);
        errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
      } else {
        console.log(`Row ${rowNumber} validation passed`);
        validRows.push({
          projectName,
          mentorName,
          mentorEmail: mentorEmail.toLowerCase(),
          menteeName,
          menteeEmail: menteeEmail ? menteeEmail.toLowerCase() : '',
          projectDetails: findColumnValue(row, ['Project Details', 'project details', 'project_details']) || 'Imported from CSV',
          projectStatus: findColumnValue(row, ['Project Status', 'project status', 'project_status']) || 'pending',
          durationRaw,
          rowNumber
        });
      }
    });

    console.log('Validation Summary:');
    console.log('  Total rows:', data.length);
    console.log('  Valid rows:', validRows.length);
    console.log('  Errors:', errors.length);
    console.log('  Warnings:', warnings.length);

    return { errors, warnings, validRows };
  };

  const processCSVData = async (validRows) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      warnings: [],
      createdProjects: [],
      updatedProjects: [],
      createdMentors: [],
      createdMentees: [],
      assignedMentors: [],
      assignedMentees: []
    };

    // Per-import caches (email -> profile)
    const mentorCache = new Map();
    const menteeCache = new Map();

    // Pre-create/fetch users to populate caches
    const pre = await preCreateUsers(validRows);
    if (pre.errors && pre.errors.length > 0) {
      results.warnings.push(...pre.errors.map((m) => `Precreate: ${m}`));
    }
    if (pre.mentorProfiles) {
      for (const [k, v] of pre.mentorProfiles.entries()) mentorCache.set(k, v);
    }
    if (pre.menteeProfiles) {
      for (const [k, v] of pre.menteeProfiles.entries()) menteeCache.set(k, v);
    }

    for (const row of validRows) {
      try {
        setUploadProgress(prev => prev + (100 / validRows.length));

        // Normalize fields
        const rowNum = row.rowNumber || 0;
        const projectName = (row.projectName || '').trim();
        const mentorName = (row.mentorName || '').trim();
        const mentorEmail = (row.mentorEmail || '').trim().toLowerCase();
        const menteeName = (row.menteeName || '').trim();
        const menteeEmail = (row.menteeEmail || '').trim().toLowerCase();
        const hasMentee = !!menteeEmail;

        // Normalize Duration
        let durationMonths = 12; // Default fallback
        if (row.durationRaw) {
          const d = parseInt(row.durationRaw, 10);
          if (!isNaN(d)) {
            if ([1, 2, 3, 4].includes(d)) {
              durationMonths = d * 6; // Convert semesters to months
            } else if ([6, 12, 18, 24].includes(d)) {
              durationMonths = d; // Already in months
            }
            // Else keep default 12
          }
        }

        if (!projectName || !mentorEmail || !menteeEmail) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Missing required fields (Project Name, Mentor Email, and Mentee Email are required)`);
          continue;
        }

        // 1) Resolve Mentor (Get or Create)
        let mentorProfile = mentorCache.get(mentorEmail) || null;
        if (!mentorProfile) {
          const { data: foundMentor, error: mentorFetchError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('email', mentorEmail)
            .maybeSingle();

          if (mentorFetchError) throw new Error(`Failed to lookup mentor: ${mentorFetchError.message}`);

          if (foundMentor) {
            mentorProfile = foundMentor;
          } else {
            const fallbackName = mentorName || mentorEmail.split('@')[0];
            const { data: createdMentor, error: createMentorError } = await supabase
              .from('users')
              .insert({ name: fallbackName, email: mentorEmail, role: 'mentor' })
              .select('id, name, email')
              .single();

            if (createMentorError) {
              results.warnings.push(`Row ${rowNum}: Mentor not found and could not be created. Proceeding without mentor_id.`);
              mentorProfile = null;
            } else {
              mentorProfile = createdMentor;
              results.createdMentors.push(createdMentor);
            }
          }
          if (mentorProfile) mentorCache.set(mentorEmail, mentorProfile);
        }

        // 2) Resolve Mentee (Get or Create)
        let menteeProfile = null;
        if (hasMentee) {
          menteeProfile = menteeCache.get(menteeEmail) || null;
          if (!menteeProfile) {
            const { data: foundMentee, error: menteeFetchError } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('email', menteeEmail)
              .maybeSingle();

            if (menteeFetchError) throw new Error(`Failed to lookup mentee: ${menteeFetchError.message}`);

            if (foundMentee) {
              menteeProfile = foundMentee;
            } else {
              const fallbackName = menteeName || menteeEmail.split('@')[0];
              const { data: createdMentee, error: createMenteeError } = await supabase
                .from('users')
                .insert({ name: fallbackName, email: menteeEmail, role: 'mentee' })
                .select('id, name, email')
                .single();

              if (createMenteeError) {
                results.warnings.push(`Row ${rowNum}: Mentee not found and could not be created. Imported project without mentee.`);
                menteeProfile = null;
              } else {
                menteeProfile = createdMentee;
                results.createdMentees.push(createdMentee);
              }
            }
            if (menteeProfile) menteeCache.set(menteeEmail, menteeProfile);
          }
        }

        // 3) ALWAYS Create New Project
        // We do NOT check for existing logic. We simply insert.
        const menteesArray = menteeProfile ? [menteeProfile.id] : [];
        const { data: newProject, error: createProjectError } = await supabase
          .from('projects')
          .insert({
            project_name: projectName,
            project_details: row.projectDetails,
            mentor_id: mentorProfile?.id || null,
            mentor_email: mentorEmail,
            mentees: menteesArray,
            mentees: menteesArray,
            assigned_by: coordinatorId,
            duration_months: durationMonths
          })
          .select()
          .single();

        if (createProjectError) throw new Error(`Failed to create project: ${createProjectError.message}`);
        results.createdProjects.push(newProject);

        // 4) ALWAYS Create Assignment Entry
        const { data: newAssign, error: assignError } = await supabase
          .from('project_assignments')
          .insert({
            project_id: newProject.id,
            project_name: projectName,
            mentor_id: mentorProfile?.id || null,
            mentor_name: mentorName || mentorProfile?.name || null,
            mentor_email: mentorEmail,
            created_by: coordinatorId,
            status: row.projectStatus
          })
          .select()
          .single();

        if (assignError) {
          // Non-fatal, just warn
          console.warn(`Row ${rowNum}: Failed to create assignment record: ${assignError.message}`);
          results.warnings.push(`Row ${rowNum}: Assignment record creation failed.`);
        }

        // 5) Link Mentee to Assignment (project_assignment_mentees)
        if (menteeProfile && newAssign) {
          const { error: linkError } = await supabase
            .from('project_assignment_mentees')
            .insert({
              assignment_id: newAssign.id,
              mentee_id: menteeProfile.id,
              mentee_name: menteeName || menteeProfile.name || null,
              mentee_email: menteeEmail
            });

          if (linkError) {
            console.warn(`Row ${rowNum}: Failed to link mentee: ${linkError.message}`);
            results.warnings.push(`Row ${rowNum}: Mentee link failed.`);
          } else {
            results.assignedMentees.push({ projectId: newProject.id, mentee: menteeProfile, row: rowNum });
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

    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setImportResults(null);

    try {
      console.log(`Parsing ${isCSV ? 'CSV' : 'Excel'} file:`, file.name);
      const data = isCSV ? await parseCSVFile(file) : await parseExcelFile(file);
      console.log('File parsed successfully:', data);

      const validation = validateAndNormalizeData(data);
      console.log('Validation result:', validation);

      // If there are validation errors but we still have valid rows, proceed with partial import
      if (validation.validRows.length === 0) {
        setImportResults({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        });
        setIsUploading(false);
        return;
      }

      const processResults = await processCSVData(validation.validRows);
      console.log('Processing complete:', processResults);

      // Merge validation errors with processing errors
      const combinedErrors = [
        ...(validation.errors || []),
        ...((processResults && processResults.errors) ? processResults.errors : [])
      ];

      setImportResults({
        success: (processResults.success || 0) > 0,
        ...processResults,
        errors: combinedErrors,
        warnings: [...(validation.warnings || []), ...((processResults && processResults.warnings) ? processResults.warnings : [])]
      });

      if (processResults.success > 0) {
        toast.success(`Successfully imported ${processResults.success} projects!`);
      }

      if (processResults.failed > 0 || validation.errors.length > 0) {
        const failedCount = (processResults.failed || 0) + validation.errors.length;
        toast.error(`${failedCount} rows failed validation or import`);
      }

      if (onImportComplete) {
        onImportComplete(processResults);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportResults({
        success: false,
        errors: [error.message],
        warnings: []
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Import Projects</h2>
        <p className="text-gray-600">Upload a CSV or Excel file to import projects</p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Required Columns:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Project Name</li>
          <li>• Mentor Name</li>
          <li>• Mentor Email</li>
          <li>• Mentee Name</li>
          <li>• Mentee Email</li>
          <li>• Duration (optional, defaults to 12 months)</li>
        </ul>
      </div>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <FaSpinner className="animate-spin" />
              Uploading... {Math.round(uploadProgress)}%
            </>
          ) : (
            <>
              <FaUpload />
              Choose File
            </>
          )}
        </button>
      </div>

      {importResults && (
        <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {importResults.success ? (
            <div className="text-green-800">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-semibold">Import Successful!</span>
              </div>
              <p>Created: {importResults.createdProjects?.length || 0} projects</p>
              <p>Updated: {importResults.updatedProjects?.length || 0} projects</p>
            </div>
          ) : (
            <div className="text-red-800">
              <div className="flex items-center gap-2 mb-2">
                <FaExclamationTriangle className="text-red-600" />
                <span className="font-semibold">Import Failed</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {importResults.errors?.slice(0, 5).map((error, idx) => (
                  <p key={idx}>• {error}</p>
                ))}
                {importResults.errors?.length > 5 && (
                  <p>... and {importResults.errors.length - 5} more errors</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVImportSimplified;
