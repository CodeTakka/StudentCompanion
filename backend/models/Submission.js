const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true }, // original file name
  filePath: { type: String, required: true }, // path where file is stored
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false }, // true if submitted after dueDate
  status: { type: String, enum: ['pending', 'graded'], default: 'pending' },
  earnedMarks: { type: Number, default: null }, // grades are stored in submission, not assessment
  feedback: { type: String, default: null }, // per-student feedback from grader
}, { timestamps: true });

// Create index for fast lookup
submissionSchema.index({ assessmentId: 1, studentId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
