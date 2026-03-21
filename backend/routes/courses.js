const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const { protect, adminOnly } = require('../middleware/auth');

// All course routes require login
router.use(protect);

// GET /api/courses
// Students see only their own courses; admins see all
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user.id };
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses.' });
  }
});

// GET /api/courses/:id
// Students can only access their own course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    // Students can only see their own courses
    if (req.user.role === 'student' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course.' });
  }
});

// GET /api/courses/:id/average
// Server-side weighted average calculation (required by rubric)
router.get('/:id/average', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (req.user.role === 'student' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const assessments = await Assessment.find({ courseId: req.params.id });

    // Only include graded assessments in the average
    const graded = assessments.filter(
      a => a.earnedMarks !== null && a.totalMarks !== null && a.totalMarks > 0
    );

    if (graded.length === 0) {
      return res.json({ average: null, message: 'No graded assessments yet.' });
    }

    // Weighted average: sum of (earnedMarks/totalMarks * weight) / sum of weights
    let weightedSum = 0;
    let totalWeight = 0;

    for (const a of graded) {
      const pct = a.earnedMarks / a.totalMarks;
      weightedSum += pct * a.weight;
      totalWeight += a.weight;
    }

    const average = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : null;

    res.json({
      average: average !== null ? Math.round(average * 100) / 100 : null, // round to 2 decimal places
      gradedCount: graded.length,
      totalCount: assessments.length
    });

  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate average.' });
  }
});

// POST /api/courses
// Students add a course they're enrolled in; admins create courses
router.post('/', async (req, res) => {
  try {
    const { code, name, instructor, term, description, enabled } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Course code and name are required.' });
    }

    const course = await Course.create({
      code, name, instructor, term, description,
      enabled: enabled !== undefined ? enabled : true,
      createdBy: req.user.id
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create course.' });
  }
});

// PUT /api/courses/:id
// Students can only edit their own courses
router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (req.user.role === 'student' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { code, name, instructor, term, description, enabled } = req.body;

    if (code)        course.code        = code;
    if (name)        course.name        = name;
    if (instructor)  course.instructor  = instructor;
    if (term)        course.term        = term;
    if (description !== undefined) course.description = description;
    if (enabled !== undefined)     course.enabled     = enabled;

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update course.' });
  }
});

// DELETE /api/courses/:id
// Delete a course and all its assessments
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (req.user.role === 'student' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Delete all assessments belonging to this course first
    await Assessment.deleteMany({ courseId: req.params.id });
    await course.deleteOne();

    res.json({ message: 'Course and its assessments deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete course.' });
  }
});

module.exports = router;