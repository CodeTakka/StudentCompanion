const express = require("express");
const router = express.Router();
const Assessment = require("../models/Assessment");
const Course = require("../models/Course");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect);

// Helper method to verify that the requesting user has access to the course
const verifyAccess = async (courseId, userId, role) => {
  const course = await Course.findById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };
  if (role === "student" && !course.enabled) {
    return { error: "Access denied.", status: 403 };
  }
  return { course };
};

// GET /api/assessments?courseId=...
// Get all assessments for a course
// For students: only returns if they're enrolled in the course
// For admins: returns all for the course
router.get("/", async (req, res) => {
  try {
    const { courseId } = req.query;
    const now = new Date();
    let filter = {};

    if (courseId) {
      const access = await verifyAccess(courseId, req.user.id, req.user.role);
      if (access.error)
        return res.status(access.status).json({ message: access.error });

      filter.courseId = courseId;
    } else if (req.user.role === "student") {
      // For students without courseId param, fetch all assessments from courses they're enrolled in
      const courses = await Course.find({ students: req.user.id });
      const courseIds = courses.map((c) => c._id);
      filter.courseId = { $in: courseIds };
    }

    // Students only see visible assessments
    if (req.user.role === "student") {
      filter.visible = true;
    }

    const assessments = await Assessment.find(filter)
      .populate("courseId", "code name")
      .sort({ dueDate: 1 });

    // For students, add completion status by checking submissions
    if (req.user.role === "student") {
      const Submission = require("../models/Submission");
      const submissionsByAssessment = {};
      const earnedMarksByAssessment = {};

      // Get all submissions for this student
      const submissions = await Submission.find({ studentId: req.user.id });
      submissions.forEach((sub) => {
        submissionsByAssessment[sub.assessmentId] = true;
        if (sub.earnedMarks !== null) {
          earnedMarksByAssessment[sub.assessmentId] = sub.earnedMarks;
        }
      });

      // Add completed flag and earned marks based on submissions
      assessments.forEach((a) => {
        a.completed = !!submissionsByAssessment[a._id];
        // Override assessment earnedMarks with submission earnedMarks if available
        if (earnedMarksByAssessment[a._id] !== undefined) {
          a.earnedMarks = earnedMarksByAssessment[a._id];
        }
      });
    }

    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assessments." });
  }
});

// GET /api/assessments/upcoming
// Get all upcoming assessments across all of the student's courses
router.get("/upcoming", async (req, res) => {
  try {
    const now = new Date();
    let filter = {
      dueDate: { $gte: now },
    };

    // Students only see visible assessments
    if (req.user.role === "student") {
      filter.visible = true;
    }

    // For students, only get assessments from courses they're enrolled in
    if (req.user.role === "student") {
      const Course = require("../models/Course");
      const courses = await Course.find({ students: req.user.id });
      const courseIds = courses.map((c) => c._id);
      filter.courseId = { $in: courseIds };
    }

    const assessments = await Assessment.find(filter)
      .populate("courseId", "code name")
      .sort({ dueDate: 1 })
      .limit(20);

    // For students, add completion status by checking submissions
    if (req.user.role === "student") {
      const Submission = require("../models/Submission");
      const submissionsByAssessment = {};
      const earnedMarksByAssessment = {};

      // Get all submissions for this student
      const submissions = await Submission.find({ studentId: req.user.id });
      submissions.forEach((sub) => {
        submissionsByAssessment[sub.assessmentId] = true;
        if (sub.earnedMarks !== null) {
          earnedMarksByAssessment[sub.assessmentId] = sub.earnedMarks;
        }
      });

      // Add completed flag and earned marks based on submissions
      assessments.forEach((a) => {
        a.completed = !!submissionsByAssessment[a._id];
      });
    }

    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch upcoming assessments." });
  }
});

// GET /api/assessments/:id
router.get("/:id", async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      ...(req.user.role === "student" ? { visible: true } : {}),
    });

    if (!assessment)
      return res.status(404).json({ message: "Assessment not found." });

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error)
      return res.status(access.status).json({ message: access.error });

    res.json(assessment);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assessment." });
  }
});

// POST /api/assessments
// Create a new assessment for a course (admins only)
router.post("/", adminOnly, async (req, res) => {
  try {
    const { courseId, name, type, weight, dueDate, visible, totalMarks } =
      req.body;

    if (!courseId || !name || !type || weight === undefined) {
      return res
        .status(400)
        .json({ message: "courseId, name, type, and weight are required." });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // Convert weight from percentage to decimal if user sent e.g. 25 instead of 0.25
    const weightDecimal = weight > 1 ? weight / 100 : weight;

    if (weightDecimal < 0 || weightDecimal > 1) {
      return res
        .status(400)
        .json({ message: "Weight must be between 0 and 100 (%)." });
    }

    // One shared assessment for the entire course
    // All students enrolled see this assessment (no per-student duplication)
    const assessment = await Assessment.create({
      courseId,
      name,
      type,
      weight: weightDecimal,
      dueDate: dueDate || null,
      visible: visible !== undefined ? visible : true,
      totalMarks: totalMarks || null,
    });

    res.status(201).json(assessment);
  } catch (err) {
    res.status(500).json({ message: "Failed to create assessment." });
  }
});

// PUT /api/assessments/:id
// For students: cannot update (submissions track completion)
// For admins: can update assessment details
router.put("/:id", async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment)
      return res.status(404).json({ message: "Assessment not found." });

    const access = await verifyAccess(
      assessment.courseId,
      req.user.id,
      req.user.role,
    );
    if (access.error)
      return res.status(access.status).json({ message: access.error });

    // Students cannot update assessments (no per-student updates now)
    if (req.user.role === "student") {
      return res
        .status(403)
        .json({ message: "Students cannot update assessments." });
    }

    const {
      name,
      type,
      weight,
      dueDate,
      visible,
      earnedMarks,
      totalMarks,
      feedback,
    } = req.body;

    // Admins can update everything
    if (name !== undefined) assessment.name = name;
    if (type !== undefined) assessment.type = type;
    if (dueDate !== undefined) assessment.dueDate = dueDate;
    if (visible !== undefined) assessment.visible = visible;
    if (totalMarks !== undefined) assessment.totalMarks = totalMarks;
    if (feedback !== undefined) assessment.feedback = feedback;

    if (weight !== undefined) {
      const weightDecimal = weight > 1 ? weight / 100 : weight;
      assessment.weight = weightDecimal;
    }

    // Validate earned marks don't exceed total marks
    if (earnedMarks !== undefined) {
      const total =
        totalMarks !== undefined ? totalMarks : assessment.totalMarks;
      if (total !== null && earnedMarks > total) {
        return res
          .status(400)
          .json({ message: "Earned marks cannot exceed total marks." });
      }
      assessment.earnedMarks = earnedMarks;
    }

    await assessment.save();
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ message: "Failed to update assessment." });
  }
});

// DELETE /api/assessments/:id
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment)
      return res.status(404).json({ message: "Assessment not found." });

    await assessment.deleteOne();
    res.json({ message: "Assessment deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete assessment." });
  }
});

module.exports = router;
