const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Delete user account endpoint
router.delete("/delete-account", async (req, res) => {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    // Extract token and verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid authentication" });
    }

    const userId = user.id;

    // Step 1: Get all projects created by or assigned to user
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .or(`created_by.eq.${userId}, mentor_id.eq.${userId}`);

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      
      // Step 2: Delete files from storage for all projects
      for (const projectId of projectIds) {
        const { data: files } = await supabase
          .from('project_files')
          .select('storage_path')
          .eq('project_id', projectId);
        
        if (files && files.length > 0) {
          const filePaths = files
            .map(f => f.storage_path)
            .filter(path => path);
          
          if (filePaths.length > 0) {
            await supabase.storage
              .from('project-files')
              .remove(filePaths);
          }
        }
      }

      // Step 3: Delete project-related data in correct order
      await supabase.from('project_files').delete().in('project_id', projectIds);
      await supabase.from('project_deliverables').delete().in('project_id', projectIds);
      await supabase.from('submissions').delete().in('project_id', projectIds);
      await supabase.from('project_team_members').delete().in('project_id', projectIds);
      
      // Step 4: Handle project assignments
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('id')
        .in('project_id', projectIds);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        await supabase.from('project_assignment_mentees').delete().in('assignment_id', assignmentIds);
        await supabase.from('project_assignments').delete().in('project_id', projectIds);
      }

      // Step 5: Delete projects
      await supabase.from('projects').delete().in('id', projectIds);
    }

    // Step 6: Delete mentor-mentee mappings
    await supabase
      .from('mentor_mentee_mappings')
      .delete()
      .or(`mentor_id.eq.${userId}, mentee_id.eq.${userId}`);

    // Step 7: Delete user profile/data
    await supabase.from('users').delete().eq('id', userId);

    // Step 8: Delete user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw new Error(`Failed to delete user from auth: ${deleteError.message}`);
    }

    res.json({ success: true, message: "Account deleted successfully" });

  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ 
      error: "Failed to delete account", 
      details: error.message 
    });
  }
});

module.exports = router;
