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
// Get all assessments for a course (for students, their own; for admins, all)
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
    }

    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    }

    const assessments = await Assessment.find(filter)
      .populate('courseId', 'code name')
      .sort({ dueDate: 1 });

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
      completed: false,
    };

    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    }

    const assessments = await Assessment.find(filter)
      .populate('courseId', 'code name')
      .sort({ dueDate: 1 })
      .limit(20);

    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch upcoming assessments." });
  }
});

// GET /api/assessments/:id
router.get("/:id", async (req, res) => {
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
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    // Convert weight from percentage to decimal if user sent e.g. 25 instead of 0.25
    const weightDecimal = weight > 1 ? weight / 100 : weight;

    if (weightDecimal < 0 || weightDecimal > 1) {
      return res
        .status(400)
        .json({ message: "Weight must be between 0 and 100 (%)." });
    }

    // Create assessment for each enrolled student
    const assessments = course.students.map(studentId => ({
      courseId,
      studentId,
      name,
      type,
      weight: weightDecimal,
      dueDate: dueDate || null,
      visible: visible !== undefined ? visible : true,
      totalMarks: totalMarks || null,
    }));

    const created = await Assessment.insertMany(assessments);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: "Failed to create assessment." });
  }
});

// PUT /api/assessments/:id
// Update an assessment (students can update their own, admins can update any)
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

    // Students can only update their own assessments
    if (req.user.role === 'student' && assessment.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const {
      name,
      type,
      weight,
      dueDate,
      visible,
      completed,
      earnedMarks,
      totalMarks,
      feedback,
    } = req.body;

    // Students can only update completed
    if (req.user.role === 'student') {
      if (completed !== undefined) assessment.completed = completed;
    } else {
      // Admins can update everything
      if (name !== undefined) assessment.name = name;
      if (type !== undefined) assessment.type = type;
      if (dueDate !== undefined) assessment.dueDate = dueDate;
      if (visible !== undefined) assessment.visible = visible;
      if (completed !== undefined) assessment.completed = completed;
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
