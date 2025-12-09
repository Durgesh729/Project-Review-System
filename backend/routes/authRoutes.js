const express = require("express");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Helper to get supabase
const getSupabase = (req) => req.app.locals.supabase;

// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "email, password and role are required" });
    }
    
    const supabase = getSupabase(req);
    const normalizedEmail = String(email).toLowerCase();
    
    // Check if user exists
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .single();
    
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }
    
    // Create new user
    const { data: user, error } = await supabase
      .from("users")
      .insert([{ 
        id: uuidv4(),
        email: normalizedEmail, 
        password, 
        role,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ success: false, message: "Failed to create user" });
    }
    
    return res.status(201).json({ success: true, message: "User registered successfully", userId: user.id });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const supabase = getSupabase(req);
    const normalizedEmail = String(email || "").toLowerCase();
    
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("password", password)
      .single();
    
    if (error || !user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const payload = { success: true, role: user.role, userId: user.id };
    if (user.role === "mentor") {
      payload.mentorId = user.id; // frontend expects mentorId for mentors
    }
    res.json(payload);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
