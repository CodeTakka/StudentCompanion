const mongoose = require('mongoose');

// Assessments will be stored directly inside the Course Template document, not in a separate collection
const templateAssessmentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, enum: ['Exam', 'Quiz', 'Assignment', 'Project', 'Lab'] },
  weight:     { type: Number, min: 0, max: 1 }
}, { _id: false });

const courseTemplateSchema = new mongoose.Schema({
  code:        { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  assessments: [templateAssessmentSchema],

  // Only admins create templates
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CourseTemplate', courseTemplateSchema);