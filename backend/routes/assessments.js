const express = require("express");
const router = express.Router();
const Assessment = require("../models/Assessment");
const Course = require("../models/Course");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect);

// Helper method to verify that the requesting student owns the parent course
const verifyAccess = async (courseId, userId, role) => {
  const course = await Course.findById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };
  if (role === "student" && course.createdBy.toString() !== userId) {
    return { error: "Access denied.", status: 403 };
  }
  return { course };
};

// GET /api/assessments?courseId=...
// Get all assessments for a course
router.get("/", async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId)
      return res
        .status(400)
        .json({ message: "courseId query param required." });

    const access = await verifyAccess(courseId, req.user.id, req.user.role);
    if (access.error)
      return res.status(access.status).json({ message: access.error });

    const assessments = await Assessment.find({ courseId }).sort({
      dueDate: 1,
    });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assessments." });
  }
});

// GET /api/assessments/upcoming
// Get all upcoming assessments across all of the student's courses
router.get("/upcoming", async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { createdBy: req.user.id };
    const courses = await Course.find(filter);
    const courseIds = courses.map((c) => c._id);

    const now = new Date();
    const assessments = await Assessment.find({
      courseId: { $in: courseIds },
      dueDate: { $gte: now },
      completed: false,
    })
      .populate("courseId", "code name")
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
// Create a new assessment for a course
router.post("/", async (req, res) => {
  try {
    const { courseId, name, type, weight, dueDate, visible, totalMarks } =
      req.body;

    if (!courseId || !name || !type || weight === undefined) {
      return res
        .status(400)
        .json({ message: "courseId, name, type, and weight are required." });
    }

    const access = await verifyAccess(courseId, req.user.id, req.user.role);
    if (access.error)
      return res.status(access.status).json({ message: access.error });

    // Convert weight from percentage to decimal if user sent e.g. 25 instead of 0.25
    const weightDecimal = weight > 1 ? weight / 100 : weight;

    if (weightDecimal < 0 || weightDecimal > 1) {
      return res
        .status(400)
        .json({ message: "Weight must be between 0 and 100 (%)." });
    }

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
// Update an assessment (includes marking completed and entering grades)
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

    const {
      name,
      type,
      weight,
      dueDate,
      visible,
      completed,
      earnedMarks,
      totalMarks,
    } = req.body;

    if (name !== undefined) assessment.name = name;
    if (type !== undefined) assessment.type = type;
    if (dueDate !== undefined) assessment.dueDate = dueDate;
    if (visible !== undefined) assessment.visible = visible;
    if (completed !== undefined) assessment.completed = completed;
    if (totalMarks !== undefined) assessment.totalMarks = totalMarks;

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
router.delete("/:id", async (req, res) => {
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

    await assessment.deleteOne();
    res.json({ message: "Assessment deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete assessment." });
  }
});

module.exports = router;
