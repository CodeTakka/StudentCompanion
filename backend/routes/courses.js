const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const CourseTemplate = require('../models/CourseTemplate');
const { protect, adminOnly } = require('../middleware/auth');

// All course routes require login
router.use(protect);

// GET /api/courses?all=true
// Students see enabled courses; admins see all; ?all=true shows all enabled for students
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    let filter = {};
    if (req.user.role === 'admin') {
      filter = {};
    } else {
      filter = { enabled: true };
      if (!all) {
        filter.students = req.user.id;
      }
    }
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses.' });
  }
});

// GET /api/courses/:id
// Students can access enabled courses; admins can access any
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    // Students can only see enabled courses
    if (req.user.role === 'student' && !course.enabled) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course.' });
  }
});

// GET /api/courses/:id/average?studentId=...
// Server-side weighted average calculation (required by rubric)
router.get('/:id/average', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (req.user.role === 'student' && !course.enabled) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { studentId } = req.query;

    let filter;
    if (studentId) {
      filter = {
        courseId: req.params.id,
        $or: [
          { studentId },
          { studentId: null },
          { studentId: { $exists: false } },
        ],
      };
    } else if (req.user.role === 'student') {
      filter = {
        courseId: req.params.id,
        $or: [
          { studentId: req.user.id },
          { studentId: null },
          { studentId: { $exists: false } },
        ],
      };
    } else {
      filter = { courseId: req.params.id };
    }

    const assessments = await Assessment.find(filter);

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

// Students can enroll in enabled courses
router.post('/:id/enroll', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can enroll.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (!course.enabled) {
      return res.status(400).json({ message: 'Course is not available for enrollment.' });
    }

    if (course.students.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already enrolled in this course.' });
    }

    course.students.push(req.user.id);
    await course.save();

    // Create assessments for the student
    const template = await CourseTemplate.findOne({ code: course.code });
    if (template) {
      const assessments = template.assessments.map(a => ({
        courseId: course._id,
        studentId: req.user.id,
        name: a.name,
        type: a.type,
        weight: a.weight
      }));
      await Assessment.insertMany(assessments);
    }

    res.json({ message: 'Enrolled successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to enroll.' });
  }
});

// PUT /api/courses/:id
// Only admins can edit courses
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

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
// Only admins can delete courses
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    // Delete all assessments belonging to this course first
    await Assessment.deleteMany({ courseId: req.params.id });
    await course.deleteOne();

    res.json({ message: 'Course and its assessments deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete course.' });
  }
});

module.exports = router;