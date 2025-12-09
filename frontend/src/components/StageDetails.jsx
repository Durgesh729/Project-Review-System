import React from 'react';
import { FaEye, FaDownload, FaSave, FaTrash, FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaUpload } from 'react-icons/fa';

function StageDetails({ 
  selectedProject, 
  uploads, 
  remarks, 
  onRemarkChange, 
  onSubmitRemark, 
  onFileView, 
  onDownload, 
  onDelete 
}) {
  const sections = {
    ideaPresentation: "Idea Presentation",
    progress1: "Progress 1",
    progress2: "Progress 2",
    phase1: "Phase 1 Report",
    progress3: "Progress 3",
    progress4: "Progress 4",
    finalReport: "Final Report",
    finalDemo: "Final Demo",
    finalPpt: "Final PPT",
    codebook: "Codebook",
    achievements: "Achievements",
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Accepted':
        return <FaCheckCircle className="text-green-500" />;
      case 'Needs Improvement':
        return <FaExclamationCircle className="text-yellow-500" />;
      case 'Rejected':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaUpload className="text-gray-500" />;
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <FaUpload className="text-6xl mx-auto mb-4 text-gray-400" />
          <p className="text-xl">Select a project to view its stages and uploaded files</p>
        </div>
      </div>
    );
  }

  // Check if project has any uploads
  const hasUploads = uploads && Object.keys(uploads).length > 0;

  if (!hasUploads) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <FaUpload className="text-6xl mx-auto mb-4 text-gray-400" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {selectedProject.group_id}_{selectedProject.project_name}
          </h3>
          <p className="text-xl">No progress available</p>
          <p className="text-sm text-gray-400 mt-2">This project hasn't uploaded any files yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800">
          {selectedProject.group_id}_{selectedProject.project_name}
        </h3>
        {selectedProject.description && (
          <p className="text-gray-600 mt-2">{selectedProject.description}</p>
        )}
        {selectedProject.domain && (
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {selectedProject.domain}
          </span>
        )}
      </div>

      <h4 className="text-xl font-semibold mb-4 text-gray-800">Uploaded Files Overview</h4>
      
      <table className="w-full border border-gray-300 text-sm rounded-lg">
        <thead>
          <tr className="bg-gray-200 text-center">
            <th className="border border-gray-300 px-6 py-3">Section</th>
            <th className="border border-gray-300 px-6 py-3">Filename</th>
            <th className="border border-gray-300 px-6 py-3">Status</th>
            <th className="border border-gray-300 px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(sections).map((section, idx) => {
            const upload = uploads[section];
            return (
              <tr key={idx} className="text-center border border-gray-200">
                <td className="border px-6 py-4 font-medium text-gray-900">{sections[section]}</td>
                <td className="border px-6 py-4 text-gray-900">{upload ? upload.filename : '-'}</td>
                <td className="border px-6 py-4">
                  <div className="flex items-center justify-center space-x-2">
                    {getStatusIcon(upload?.remark)}
                    <select
                      value={remarks[section] !== undefined ? remarks[section] : (upload?.remark || '')}
                      onChange={(e) => onRemarkChange(section, e)}
                      className="border border-gray-400 rounded px-3 py-2 w-48 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 border">
                  {upload ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => onFileView(section)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <FaEye />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => onDownload(section)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <FaDownload />
                          <span>Download</span>
                        </button>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => onSubmitRemark(section)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <FaSave />
                          <span>Save Remark</span>
                        </button>
                        <button
                          onClick={() => onDelete(section, upload.filename)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <FaTrash />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StageDetails;
