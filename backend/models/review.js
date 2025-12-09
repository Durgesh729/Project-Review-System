const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
