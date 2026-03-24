const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    instructor: { type: String },
    term: { type: String },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Course", courseSchema);
