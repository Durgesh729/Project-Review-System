const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to get supabase
const getSupabase = (req) => req.app.locals.supabase;

// Create a rich project (title/domain/description/deadline/teamMembers/mentor)
router.post("/projects", async (req, res) => {
  try {
    const {
      title,
      domain = "General",
      description = "",
      deadline,
      teamMembers = [],
      mentorName = "",
      mentorEmail = "",
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Project title is required" });
    }

    const supabase = getSupabase(req);
    const normalizedTeam = Array.isArray(teamMembers) && teamMembers.length > 0
      ? teamMembers
          .filter((tm) => tm && (tm.name || tm.role))
          .map((tm) => ({ name: tm.name || "Team Member", role: tm.role || "Developer" }))
      : [{ name: "Team Member", role: "Developer" }];

    // Find mentor if email provided
    let mentorId = null;
    if (mentorEmail) {
      const { data: mentor } = await supabase
        .from("users")
        .select("id")
        .eq("email", mentorEmail.toLowerCase())
        .single();
      if (mentor) {
        mentorId = mentor.id;
      }
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert([{
        id: uuidv4(),
        title,
        project_name: title,
        domain,
        description: description || "No description provided",
        deadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        team_members: normalizedTeam,
        mentor_email: mentorEmail || "unassigned@example.com",
        mentor_id: mentorId || uuidv4(),
        created_by: uuidv4(),
        avg_rating: 0,
        ratings_count: 0,
        status: "draft",
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error("Create project error:", error);
      return res.status(500).json({ success: false, message: "Server error while creating project", error: error.message });
    }

    return res.status(201).json({ success: true, message: "Project created", projectId: project.id, data: project });
  } catch (err) {
    console.error("Create project error:", err);
    return res.status(500).json({ success: false, message: "Server error while creating project", error: err.message });
  }
});

// Fetch Projects for a Mentee (legacy route kept for compatibility but names corrected)
router.get("/projects/by-mentee/:menteeEmail", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("mentee_email", req.params.menteeEmail);
    
    if (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
    res.json({ success: true, projects: projects || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all projects (rich projects list for Projects page)
router.get("/projects", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { search } = req.query;
    
    let query = supabase.from("projects").select("*");
    
    if (search && String(search).trim()) {
      const term = String(search).trim();
      query = query.or(`title.ilike.%${term}%,domain.ilike.%${term}%`);
    }
    
    const { data: projects, error } = await query.order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching projects:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch projects" });
    }
    
    res.json({ success: true, data: projects || [] });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
});

// Get project by id (details)
router.get("/projects/:id", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", req.params.id)
      .single();
    
    if (error || !project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch project" });
  }
});

// Get project details by id
router.get("/projects/:id/detail", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", req.params.id)
      .single();
    
    if (error || !project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch project" });
  }
});

// List reviews for a project
router.get("/projects/:id/reviews", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("project_id", req.params.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching reviews:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
    res.json({ success: true, data: reviews || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// Create a review and update project's average rating
router.post("/projects/:id/reviews", async (req, res) => {
  try {
    const { reviewerId = null, rating, comment = "" } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const supabase = getSupabase(req);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", req.params.id)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert([{
        id: uuidv4(),
        project_id: project.id,
        reviewer_id: reviewerId,
        rating,
        comment,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (reviewError) {
      console.error("Create review error:", reviewError);
      return res.status(500).json({ success: false, message: "Failed to create review" });
    }

    // Update rolling average
    const total = project.avg_rating * project.ratings_count + rating;
    const count = project.ratings_count + 1;
    const avgRating = Number((total / count).toFixed(2));
    
    await supabase
      .from("projects")
      .update({ avg_rating: avgRating, ratings_count: count })
      .eq("id", project.id);

    res.status(201).json({ success: true, data: review, avgRating, ratingsCount: count });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ success: false, message: "Failed to create review" });
  }
});

// Standardized reviews endpoints per spec
router.get("/reviews", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: "projectId is required" });
    
    const supabase = getSupabase(req);
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching reviews:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
    return res.json({ success: true, data: reviews || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const { projectId, reviewerId = null, rating, comment = "" } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: "projectId is required" });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }
    
    const supabase = getSupabase(req);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert([{
        id: uuidv4(),
        project_id: projectId,
        reviewer_id: reviewerId,
        rating,
        comment,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (reviewError) {
      console.error("Create review error:", reviewError);
      return res.status(500).json({ success: false, message: "Failed to create review" });
    }

    // Update rolling average
    const total = project.avg_rating * project.ratings_count + rating;
    const count = project.ratings_count + 1;
    const avgRating = Number((total / count).toFixed(2));
    
    await supabase
      .from("projects")
      .update({ avg_rating: avgRating, ratings_count: count })
      .eq("id", projectId);

    return res.status(201).json({ success: true, data: review, avgRating, ratingsCount: count });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to create review" });
  }
});

// Contacts endpoint per spec
router.post("/contacts", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "name, email and message are required" });
    }
    
    const supabase = getSupabase(req);
    const { data: doc, error } = await supabase
      .from("contacts")
      .insert([{
        id: uuidv4(),
        name,
        email,
        message,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Create contact error:", error);
      return res.status(500).json({ success: false, message: "Failed to store contact" });
    }
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to store contact" });
  }
});

module.exports = router;

