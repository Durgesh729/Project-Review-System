// ...existing code...
require('dotenv').config(); // Load environment variables from .env file
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const { Readable } = require("stream");

// Import routes
const contactRoutes = require("./routes/contact.js");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const hodRoutes = require("./routes/hodRoutes");
const mentorRoutes = require("./routes/mentorRoutes");

// App + config
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Multer for memory storage for Supabase uploads
const upload = multer({ storage: multer.memoryStorage() });

// Expose a placeholder supabase variable (will be set after dynamic import)
let supabase = null;

// Use routes
app.use("/api", contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", projectRoutes);
app.use("/api", hodRoutes);
app.use("/api", mentorRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend is running!" });
});

// (All route handlers below reference the `supabase` variable declared above)
// ...existing code...
// For brevity the rest of your existing route handlers stay unchanged but will use the `supabase` variable.
// Make sure they remain in this file after this point and before the setupRealtimeSubscriptions/startServer sections.
// ...existing code...

// Realtime subscriptions and server start are executed after supabase is initialized
const setupRealtimeSubscriptions = () => {
  if (!supabase) return;
  // Subscribe to projects table changes
  const projectsSubscription = supabase
    .channel('projects_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Projects table changed:', payload);
      }
    )
    .subscribe();

  const reviewsSubscription = supabase
    .channel('reviews_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'reviews' },
      (payload) => {
        console.log('Reviews table changed:', payload);
      }
    )
    .subscribe();

  const contactsSubscription = supabase
    .channel('contacts_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'contacts' },
      (payload) => {
        console.log('Contacts table changed:', payload);
      }
    )
    .subscribe();

  console.log('Realtime subscriptions established');
};

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    console.error("Error starting server:", err);
    process.exit(1);
  });

  if (process.env.NODE_ENV !== 'test') {
    setupRealtimeSubscriptions();
  }
}

// Initialize Supabase and start server
(async () => {
  try {
    // Initialize Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("❌ Supabase URL or ANON KEY missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file.");
      process.exit(1);
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    app.locals.supabase = supabase;
    console.log("✅ Supabase connected");

    // Start server after Supabase is ready
    startServer();
  } catch (err) {
    console.error("Failed to initialize Supabase:", err);
    process.exit(1);
  }
})();
// ...existing code...