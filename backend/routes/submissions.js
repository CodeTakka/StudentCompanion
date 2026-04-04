const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Submission = require("../models/Submission");
const Assessment = require("../models/Assessment");
const Course = require("../models/Course");
const upload = require("../middleware/upload");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect);

// Helper to verify course access
const verifyAccess = async (courseId, userId, role) => {
  const course = await Course.findById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };
  if (role === "student" && !course.enabled) {
    return { error: "Access denied.", status: 403 };
  }
  return { course };
};

// POST /api/submissions
// Student submits a file for an assessment
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { assessmentId } = req.body;

    if (!assessmentId || !req.file) {
      return res
        .status(400)
        .json({ message: "assessmentId and file are required." });
    }

    // Verify assessment exists
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      // Clean up uploaded file if assessment not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Assessment not found." });
    }

    // Verify student is enrolled in the course
    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      fs.unlinkSync(req.file.path);
      return res.status(access.status).json({ message: access.error });
    }

    // Check if submission is late
    const isLate = assessment.dueDate && new Date() > assessment.dueDate;

    // Create submission record
    const submission = new Submission({
      assessmentId,
      studentId: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      isLate,
      status: "submitted",
    });

    await submission.save();

    res.status(201).json({
      message: "File submitted successfully.",
      submission: {
        id: submission._id,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        isLate: submission.isLate,
      },
    });
  } catch (err) {
    // Clean up file if error occurs
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Failed to submit assessment." });
  }
});

// GET /api/submissions?assessmentId=...&studentId=...
// Fetch submissions for an assessment + student
router.post("/grade", adminOnly, async (req, res) => {
  try {
    const { assessmentId, studentId, earnedMarks, feedback } = req.body;

    if (!assessmentId || !studentId || earnedMarks == null) {
      return res.status(400).json({
        message: "assessmentId, studentId, and earnedMarks are required.",
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    let submission = await Submission.findOne({ assessmentId, studentId });

    if (!submission) {
      submission = new Submission({
        assessmentId,
        studentId,
        fileName: null,
        filePath: null,
        status: "graded",
        earnedMarks,
        feedback: feedback || null,
      });
    } else {
      submission.earnedMarks = earnedMarks;
      submission.feedback = feedback || null;
      submission.status = "graded";
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({
      message: "Failed to save graded submission.",
      error: err.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const studentId = req.user.id;
    const subs = await Submission.find({ studentId });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: "Failed to load submissions." });
  }
});

router.get("/by-assessment", async (req, res) => {
  try {
    const { assessmentId, studentId } = req.query;

    if (!assessmentId) {
      return res
        .status(400)
        .json({ message: "assessmentId query param required." });
    }

    // Verify assessment exists
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const query = { assessmentId };

    if (req.user.role === "student") {
      // Students can only see their own submissions
      query.studentId = req.user.id;
    } else if (studentId) {
      // Admins can query specific student
      query.studentId = studentId;
    }

    const submissions = await Submission.find(query).sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
});

// GET /api/assessments/:id/submissions
// Admin fetches all submissions for an assessment
router.get("/assessment/:assessmentId/all", adminOnly, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    // Verify admin access to course
    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    // Fetch all submissions for this assessment
    const submissions = await Submission.find({ assessmentId })
      .populate("studentId", "firstName lastName email")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
});

// PUT /api/submissions/:id
// Admin updates submission grading (earnedMarks, feedback) after grading
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Verify admin has access to the course
    const assessment = await Assessment.findById(submission.assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    // Update submission grading fields
    if (req.body.status !== undefined) {
      submission.status = req.body.status;
    }
    if (req.body.earnedMarks !== undefined) {
      // Validate earned marks don't exceed total marks
      if (
        assessment.totalMarks !== null &&
        req.body.earnedMarks > assessment.totalMarks
      ) {
        return res
          .status(400)
          .json({ message: "Earned marks cannot exceed total marks." });
      }
      submission.earnedMarks = req.body.earnedMarks;
      submission.status = "graded"; // Auto-set to graded when marks are entered
    }
    if (req.body.feedback !== undefined) {
      submission.feedback = req.body.feedback;
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: "Failed to update submission." });
  }
});

// DELETE /api/submissions/:assessmentId/cancel
router.delete("/:assessmentId/cancel", protect, async (req, res) => {
  try {
    const assessmentId = req.params.assessmentId;
    const studentId = req.user.id;

    const sub = await Submission.findOne({ assessmentId, studentId });
    if (!sub) {
      return res.status(404).json({ message: "No submission to cancel." });
    }

    // Delete file safely
    if (sub.filePath && fs.existsSync(sub.filePath)) {
      try {
        fs.unlinkSync(sub.filePath);
      } catch (err) {
        console.error("File delete error:", err);
      }
    }

    // Remove file but keep grade
    sub.fileName = null;
    sub.filePath = null;
    sub.status = "cancelled";
    await sub.save();

    return res.json({ message: "Submission cancelled." });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Failed to cancel submission." });
  }
});

// DELETE /api/submissions/:id
// Admin deletes a submission
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Verify admin has access
    const assessment = await Assessment.findById(submission.assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    // Delete file from filesystem
    if (fs.existsSync(submission.filePath)) {
      fs.unlinkSync(submission.filePath);
    }

    await submission.deleteOne();
    res.json({ message: "Submission deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete submission." });
  }
});

// GET /api/submissions/:id/download
// Download submitted file
router.get("/:id/download", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Verify user has access (student can download own, admin can download any)
    if (
      req.user.role === "student" &&
      submission.studentId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const assessment = await Assessment.findById(submission.assessmentId);
    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    // Check file exists
    if (!fs.existsSync(submission.filePath)) {
      return res.status(404).json({ message: "File not found." });
    }

    res.download(submission.filePath, submission.fileName);
  } catch (err) {
    res.status(500).json({ message: "Failed to download file." });
  }
});

module.exports = router;
