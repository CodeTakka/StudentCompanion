const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Submission = require("../models/Submission");
const Assessment = require("../models/Assessment");
const CourseTemplate = require("../models/CourseTemplate");
const { protect, adminOnly } = require("../middleware/auth");

// All admin routes require login + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats
// Anonymized usage statistics for view-statistics.html
router.get("/stats", async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalCourses = await Course.countDocuments();
    const enabledCourses = await Course.countDocuments({ enabled: true });

    // Count all submissions from all students
    const submissions = await Submission.find();

    const totalAssessments = submissions.length;

    const completedAssessments = submissions.filter(
      s => s.earnedMarks != null
    ).length;

    const completionRate =
      totalAssessments > 0
        ? Math.round((completedAssessments / totalAssessments) * 100)
        : 0;

    res.json({
      totalStudents,
      totalCourses,
      enabledCourses,
      disabledCourses: totalCourses - enabledCourses,
      totalAssessments,
      completedAssessments,
      completionRate
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch statistics." });
  }
});

// GET /api/admin/templates
// List all reusable course templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await CourseTemplate.find().sort({ name: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch templates." });
  }
});

// POST /api/admin/templates
// Create a reusable course template
router.post("/templates", async (req, res) => {
  try {
    const { code, name, description, assessments } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required." });
    }

    const template = await CourseTemplate.create({
      code,
      name,
      description,
      assessments: assessments || [],
      createdBy: req.user.id,
    });

    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to create template." });
  }
});

// DELETE /api/admin/templates/:id
router.delete("/templates/:id", async (req, res) => {
  try {
    const template = await CourseTemplate.findByIdAndDelete(req.params.id);
    if (!template)
      return res.status(404).json({ message: "Template not found." });
    res.json({ message: "Template deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete template." });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username email');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user.' });
  }
});

module.exports = router;
