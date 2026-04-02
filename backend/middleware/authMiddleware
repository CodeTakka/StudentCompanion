const mongoose = require("mongoose");

const mockStudentId = new mongoose.Types.ObjectId("65f100000000000000000001");

const protect = (req, res, next) => {
  req.user = { id: mockStudentId };
  next();
};

module.exports = { protect };
