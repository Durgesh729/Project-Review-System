// models/Project.js
const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Team member name is required'] 
    },
    role: { 
      type: String, 
      required: [true, 'Team member role is required'] 
    },
  }, 
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [200, 'Project title cannot be more than 200 characters']
    },
    domain: { 
      type: String, 
      required: [true, 'Project domain is required'],
      trim: true
    },
    description: { 
      type: String, 
      required: [true, 'Project description is required'],
      trim: true
    },
    deadline: { 
      type: Date, 
      required: [true, 'Project deadline is required']
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'on_hold'],
      default: 'draft'
    },
    teamMembers: { 
      type: [teamMemberSchema], 
      validate: {
        validator: function(v) {
          return v.length > 0;
        },
        message: 'At least one team member is required'
      }
    },
    mentorEmail: { 
      type: String, 
      required: [true, 'Mentor email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor ID is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    avgRating: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 5
    },
    ratingsCount: { 
      type: Number, 
      default: 0,
      min: 0
    },
    // For backward compatibility
    projectName: { type: String },
    menteeEmail: { type: String },
  }, 
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
projectSchema.index({ mentorEmail: 1 });
projectSchema.index({ mentorId: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ status: 1 });

// Virtual for mentor details
projectSchema.virtual('mentor', {
  ref: 'User',
  localField: 'mentorId',
  foreignField: '_id',
  justOne: true
});

// Virtual for creator details
projectSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Project', projectSchema);
