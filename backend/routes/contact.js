const express = require("express");
const router = express.Router();

const fs = require('fs');
const path = require('path');

// Get supabase from app.locals (set in server.js)
const getSupabase = (req) => {
  const supabase = req.app.locals.supabase;
  const logPath = path.join(__dirname, '..', 'debug.log');
  const logMsg = `${new Date().toISOString()} - getSupabase check. Locals keys: ${Object.keys(req.app.locals).join(',')}. Has Supabase: ${!!supabase}\n`;
  fs.appendFileSync(logPath, logMsg);
  return supabase;
};

// Import email utility
const { sendContactEmail } = require("../lib/email");

router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, and message"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Validate field lengths
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be less than 100 characters"
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Email must be less than 255 characters"
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message must be less than 1000 characters"
      });
    }

    const supabase = getSupabase(req);
    if (!supabase) {
      console.error("Database connection not available");
      return res.status(500).json({
        success: false,
        message: "Database connection not available"
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    console.log("Inserting contact form data:", sanitizedData);

    const { error } = await supabase
      .from("contacts")
      .insert([sanitizedData]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit contact form. Please try again later."
      });
    }

    console.log("Contact form data saved to database successfully");

    // Send emails synchronously and handle errors properly
    console.log("Attempting to send contact emails...");
    try {
      await sendContactEmail(sanitizedData);
      console.log("Contact emails sent successfully to:", process.env.ADMIN_EMAIL);

      res.json({
        success: true,
        message: "Message successfully received! We will get back to you soon."
      });
    } catch (emailError) {
      console.error("Failed to send contact emails:", emailError);
      // Still return success since the form data was saved, but log the email error
      // In production, you might want to queue the email for retry or notify admins
      res.json({
        success: true,
        message: "Message successfully received! We will get back to you soon. (Note: There was an issue sending confirmation emails, but your message was recorded.)"
      });
    }
  } catch (err) {
    console.error("Server error in contact route:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
});

// Admin endpoint to get all contacts
router.get("/admin/contacts", async (req, res) => {
  try {
    const supabase = getSupabase(req);
    if (!supabase) {
      console.error("Database connection not available for admin contacts");
      return res.status(500).json({
        success: false,
        message: "Database connection not available"
      });
    }

    console.log("Fetching contact submissions for admin");

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch contacts. Please try again later."
      });
    }

    console.log(`Successfully fetched ${data ? data.length : 0} contact submissions`);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    const logPath = require('path').join(__dirname, '..', 'debug.log');
    require('fs').appendFileSync(logPath, `${new Date().toISOString()} - Admin contact route error: ${err.message}\n${err.stack}\n`);
    console.error("Server error in admin contacts route:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
});

module.exports = router;
