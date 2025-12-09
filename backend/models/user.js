const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Primary role kept for backward compatibility with legacy dashboards
  role: {
    type: String,
    enum: ["pending", "mentor", "mentee", "project_coordinator", "hod"],
    required: true,
  },
  // Roles array allows assigning multiple roles as the system evolves
  roles: {
    type: [String],
    enum: ["mentor", "mentee", "project_coordinator", "hod"],
    default: [],
  },
  mentor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

module.exports = mongoose.model("User", userSchema);
