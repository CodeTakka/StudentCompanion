const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, default: null },
  filePath: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false },

  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'graded', 'cancelled'], 
    default: 'pending' 
  },

  earnedMarks: { type: Number, default: null },
  feedback: { type: String, default: null },
}, { timestamps: true });

submissionSchema.index({ assessmentId: 1, studentId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);