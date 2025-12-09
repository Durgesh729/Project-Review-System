const express = require("express");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Helper to get supabase
const getSupabase = (req) => req.app.locals.supabase;

// Get all mentors
router.get("/mentors", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: mentors, error } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("role", "mentor");
    
    if (error) {
      console.error("Error fetching mentors:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch mentors" });
    }
    
    res.json({ success: true, data: mentors || [] });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ success: false, message: "Failed to fetch mentors" });
  }
});

// Get all mentees
router.get("/mentees", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: mentees, error } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("role", "mentee");
    
    if (error) {
      console.error("Error fetching mentees:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch mentees" });
    }
    
    res.json({ success: true, data: mentees || [] });
  } catch (error) {
    console.error("Error fetching mentees:", error);
    res.status(500).json({ success: false, message: "Failed to fetch mentees" });
  }
});

// Get project details for HOD
router.get("/project-details", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching project details:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch project details" });
    }

    res.json({ success: true, data: projects || [] });
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).json({ success: false, message: "Failed to fetch project details" });
  }
});

// Add project assignment endpoint (used by Project Coordinator)
router.post("/add-project", async (req, res) => {
  try {
    const { projectName, mentorEmail, menteeEmail } = req.body;

    if (!projectName || !mentorEmail || !menteeEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "projectName, mentorEmail, and menteeEmail are required" 
      });
    }

    const supabase = getSupabase(req);

    // Verify mentor exists
    const { data: mentor } = await supabase
      .from("users")
      .select("*")
      .eq("email", mentorEmail.toLowerCase())
      .eq("role", "mentor")
      .single();
    
    if (!mentor) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor not found with the provided email" 
      });
    }

    // Verify mentee exists
    const { data: mentee } = await supabase
      .from("users")
      .select("*")
      .eq("email", menteeEmail.toLowerCase())
      .eq("role", "mentee")
      .single();
    
    if (!mentee) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentee not found with the provided email" 
      });
    }

    // Create a simple project assignment
    const { data: project, error } = await supabase
      .from("projects")
      .insert([{
        id: uuidv4(),
        title: projectName,
        project_name: projectName,
        domain: "General",
        description: "Project assigned by coordinator",
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        team_members: [{ name: mentee.email, role: "Developer" }],
        mentor_email: mentor.email,
        mentor_id: mentor.id,
        mentee_email: mentee.email,
        created_by: mentee.id,
        status: "in_progress",
        avg_rating: 0,
        ratings_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error("Error assigning project:", error);
      return res.status(500).json({ success: false, message: "Failed to assign project" });
    }

    res.status(201).json({ 
      success: true, 
      message: "Project assigned successfully",
      data: project
    });
  } catch (error) {
    console.error("Error assigning project:", error);
    res.status(500).json({ success: false, message: "Failed to assign project" });
  }
});

module.exports = router;
