const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['Exam', 'Quiz', 'Assignment', 'Project', 'Lab'] },
  weight:     { type: Number, max: 1 },  // stored as decimal (example: 0.1 for 10%)
  dueDate:    { type: Date, default: null },
  visible:    { type: Boolean, default: false },
  completed:  { type: Boolean, default: false },
  earnedMarks:{ type: Number, default: null },
  totalMarks: { type: Number }
});

module.exports = mongoose.model('Assessment', assessmentSchema);