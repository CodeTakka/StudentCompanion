require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

connectDB(); // connects to mongoDB

// Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// Express handles the files directly instead of using a separate web server
app.use(express.static(path.join(__dirname, "..")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/assessments", require("./routes/assessments"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Smart Course Companion API is running." });
});

/* Fallback
    If a user navigates directly to a sub-page or refreshes the browser,
    they're redirected to the frontend app instead of a "404 Not Found" error from the server
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../home-page.html"));
});

// Starting the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
