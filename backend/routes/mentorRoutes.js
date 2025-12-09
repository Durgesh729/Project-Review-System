const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper to get supabase
const getSupabase = (req) => req.app.locals.supabase;

// Get all projects for a mentor
router.get('/mentor/:mentorId/projects', auth, async (req, res) => {
  try {
    // Verify the requesting user is the mentor or an admin
    if (req.user.role !== 'admin' && req.user._id !== req.params.mentorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access these projects' 
      });
    }

    const supabase = getSupabase(req);
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('mentor_id', req.params.mentorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mentor projects:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch projects',
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      data: projects || [] 
    });
  } catch (error) {
    console.error('Error fetching mentor projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch projects',
      error: error.message 
    });
  }
});

// Get a single project with all details
router.get('/projects/:projectId', auth, async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Verify the requesting user has access to this project
    if (req.user.role !== 'admin' && 
        project.mentor_id !== req.user._id &&
        project.created_by !== req.user._id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this project' 
      });
    }

    res.json({ 
      success: true, 
      data: project 
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project',
      error: error.message 
    });
  }
});

module.exports = router;
