# CSV Import Feature Guide

## Overview
The CSV Import feature allows Project Coordinators to bulk import project assignments from CSV or Excel files. This feature streamlines the process of assigning projects to mentors and mentees.

## Features
- ✅ **File Upload**: Support for CSV and Excel files
- ✅ **Data Validation**: Comprehensive validation of required fields and data formats
- ✅ **Duplicate Handling**: Smart handling of existing projects (update vs create)
- ✅ **User Lookup**: Automatic lookup of existing mentors and mentees
- ✅ **Real-time Updates**: Automatic dashboard refresh after import
- ✅ **Error Reporting**: Detailed error and warning messages
- ✅ **Template Download**: Pre-built CSV template for easy data entry

## How to Use

### 1. Access CSV Import
1. Log in as a Project Coordinator
2. Navigate to the Project Coordinator Dashboard
3. Click the **"Import CSV"** button in the header
4. The CSV import section will appear below the header

### 2. Prepare Your CSV File

#### Required Columns:
- **Project Name**: Name of the project
- **Mentor Name**: Full name of the mentor
- **Mentor Email**: Email address of the mentor
- **Mentee Name**: Full name of the mentee
- **Mentee Email**: Email address of the mentee

#### Optional Columns:
- **Project Details**: Description of the project
- **Project Status**: Status of the project (pending, active, completed)

#### Sample CSV Format:
```csv
Project Name,Mentor Name,Mentor Email,Mentee Name,Mentee Email,Project Details,Project Status
"AI Learning System","Dr. Sarah Johnson","sarah.johnson@git-india.edu.in","Alice Smith","alice.smith@git-india.edu.in","Develop an AI-powered learning system","active"
"Blockchain Certificates","Dr. Michael Chen","michael.chen@git-india.edu.in","Bob Wilson","bob.wilson@git-india.edu.in","Create blockchain-based certificate verification","pending"
```

### 3. Import Process
1. **Download Template**: Click "Download Template" to get a properly formatted CSV template
2. **Fill Data**: Add your project data to the CSV file
3. **Upload File**: Click "Choose File" and select your CSV file
4. **Validation**: The system will validate your data and show any errors
5. **Processing**: If validation passes, the system will process each row
6. **Results**: View detailed results including success/failure counts

### 4. Understanding Results

#### Success Indicators:
- ✅ **Successfully processed**: Number of projects imported successfully
- 📝 **Created**: Number of new projects created
- 🔄 **Updated**: Number of existing projects updated
- 👨‍🏫 **Assigned**: Number of mentors assigned
- 👨‍🎓 **Assigned**: Number of mentees assigned

#### Error Handling:
- **Missing Required Fields**: Project Name, Mentor Name, Mentor Email, Mentee Name, Mentee Email
- **Invalid Email Format**: Email addresses must be valid
- **User Not Found**: Mentee email must exist in the system
- **Duplicate Projects**: Projects with the same name will be updated

## Data Processing Logic

### 1. Project Handling
- **New Projects**: Creates new project entries in the database
- **Existing Projects**: Updates existing projects with new information
- **Duplicate Prevention**: Prevents duplicate project creation

### 2. User Assignment
- **Mentor Lookup**: Searches for existing mentor by email
- **Mentee Lookup**: Searches for existing mentee by email
- **Assignment Records**: Creates project assignment records
- **Team Linking**: Links mentees to their assigned mentors

### 3. Database Updates
- **Projects Table**: Creates/updates project records
- **Project Assignments**: Creates assignment records
- **Project Assignment Mentees**: Links mentees to projects
- **Real-time Refresh**: Updates all related dashboards

## Error Messages and Solutions

### Common Errors:
1. **"Missing required columns"**
   - Solution: Ensure all required columns are present in your CSV

2. **"Invalid email format"**
   - Solution: Check email addresses for proper format (user@domain.com)

3. **"Mentee not found"**
   - Solution: Ensure mentee email exists in the system or create the user account first

4. **"Failed to create project"**
   - Solution: Check database permissions and try again

### Warning Messages:
1. **"Duplicate project name in CSV"**
   - Info: The system will update existing projects instead of creating duplicates

2. **"Mentor not found"**
   - Info: Project will be created with mentor email but no mentor profile link

## Best Practices

### 1. Data Preparation
- Use the provided template to ensure proper formatting
- Validate email addresses before importing
- Ensure mentee accounts exist in the system
- Use consistent naming conventions

### 2. File Management
- Keep CSV files under 1000 rows for optimal performance
- Use UTF-8 encoding for special characters
- Save as CSV format for best compatibility

### 3. Testing
- Test with small batches first
- Verify results after import
- Check all related dashboards for updates

## Technical Details

### Dependencies
- **PapaParse**: CSV parsing library
- **Supabase**: Database operations
- **React**: UI components

### File Support
- **CSV**: Comma-separated values (.csv)
- **Excel**: Microsoft Excel files (.xlsx, .xls)

### Performance
- **Batch Processing**: Processes rows sequentially
- **Progress Tracking**: Shows real-time progress
- **Error Recovery**: Continues processing after individual row errors

## Troubleshooting

### Import Fails Completely
1. Check file format (must be CSV or Excel)
2. Verify all required columns are present
3. Check database connectivity
4. Review error messages for specific issues

### Partial Import Success
1. Review error messages for failed rows
2. Fix data issues in CSV file
3. Re-import with corrected data
4. Check for duplicate project names

### Dashboard Not Updating
1. Refresh the page manually
2. Check if import completed successfully
3. Verify database permissions
4. Check browser console for errors

## Support

For technical support or questions about the CSV import feature:
1. Check the error messages for specific guidance
2. Review this documentation
3. Test with the provided sample CSV file
4. Contact the development team for assistance

## Sample Files

- **Template**: Download from the import interface
- **Sample Data**: `sample_projects.csv` in the project root
- **Test Page**: `test-csv-import.html` for testing functionality

---

*Last updated: December 2024*
