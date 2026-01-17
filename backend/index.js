require("dotenv").config();
const express = require("express");
const Supabase = require("supabase");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const SUPABASE_URL = process.env.SUPABASE_URL;

// Import routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const hodRoutes = require("./routes/hodRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const deleteAccountRoutes = require("./routes/deleteAccountRoutes");

// Apply routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/auth", deleteAccountRoutes);

// Connect to MongoDB (no deprecated options needed anymore 🚀)
Supabase.connect(SUPABASE_URL)
  .then(() => console.log("✅ Supabase connected"))
  .catch((err) => console.error("❌ Supabase connection error:", err));



// Define a test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Catch-all 404 (helps identify missing paths)
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Not Found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
