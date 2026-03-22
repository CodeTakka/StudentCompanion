requireAuth();

document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("createCourseForm");
  const messageDiv = document.getElementById("message");
  const submitButton = document.getElementById("submitCourseButton");

  let editId = null; // MongoDB _id of course being edited (null = creating new)

  const requiredFields = [
    { name: "code", label: "Course Code" },
    { name: "name", label: "Course Name" },
    { name: "instructor", label: "Instructor Name" },
    { name: "termSeason", label: "Term/Season" },
    { name: "termYear", label: "Year" },
  ];

  function showMessage(msg, type = "success") {
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = msg;
  }

  function validateForm() {
    let isValid = true;
    const errors = [];
    form
      .querySelectorAll("input, select, textarea")
      .forEach((i) => i.classList.remove("error-field"));

    requiredFields.forEach((field) => {
      const input = form.querySelector(`[name=${field.name}]`);
      if (!input) return;
      if (!input.value.trim()) {
        input.classList.add("error-field");
        isValid = false;
        errors.push(`Please fill ${field.label}`);
      }
      if (field.name === "termYear") {
        const year = Number(input.value);
        if (isNaN(year) || year < 1900 || year > 2100) {
          input.classList.add("error-field");
          isValid = false;
          errors.push("Year must be between 1900 and 2100");
        }
      }
    });

    if (!isValid) {
      messageDiv.className = "message error";
      messageDiv.innerHTML = errors.join("<br>");
    }
    return isValid;
  }

  async function loadCourses() {
    try {
      const courses = await apiGetCourses();
      displayCourses(courses);
    } catch (err) {
      showMessage("Failed to load courses: " + err.message, "error");
    }
  }

  function displayCourses(courses) {
    const list = document.getElementById("courseList");
    list.innerHTML = "";

  
    if (!courses.length) { // If course.length is 0
      list.innerHTML =
        '<p style="color:#888; padding:10px">No courses yet.</p>';
      return;
    }

    courses.forEach((course) => {
      list.innerHTML += `
        <div class="course-card${!course.enabled ? " disabled" : ""}">
          <div class="course-title">${course.code} - ${course.name}</div>
          <div>${course.instructor || ""} | ${course.term || ""}</div>
          <div>${course.description || ""}</div>
          <div class="course-actions">
            <button onclick="editCourse('${course._id}')">Edit</button>
            <button onclick="deleteCourse('${course._id}')">Delete</button>
          </div>
        </div>`;
    });
  }

  // Form submit
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      code: form.code.value.trim(),
      name: form.name.value.trim(),
      instructor: form.instructor.value.trim(),
      term: `${form.termSeason.value} ${form.termYear.value}`,
      description: form.description.value.trim(),
      enabled: form.enabled.checked,
    };

    submitButton.disabled = true;

    try {
      if (editId) {
        await apiUpdateCourse(editId, payload);
        showMessage("Course updated successfully!");
        submitButton.textContent = "Create Course";
        editId = null;
      } else {
        await apiCreateCourse(payload);
        showMessage("Course created successfully!");
      }
      form.reset();
      await loadCourses();
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  //  Sample course
  document.getElementById("sampleCourse")?.addEventListener("click", async function () {
      try {
        await apiCreateCourse({
          code: "COMP249",
          name: "Object-Oriented Programming II",
          instructor: "Dr. Dargham",
          term: "Winter 2026",
          description:
            "Intermediate to advanced programming topics like inheritance, polymorphism, exception handling, I/O, and more.",
          enabled: true,
        });
        showMessage("Sample course created successfully!");
        await loadCourses();
      } catch (err) {
        showMessage(err.message, "error");
      }
    });

  // Edit
  window.editCourse = async function (id) {
    try {
      const course = await apiGetCourse(id);
      const termParts = (course.term || "").split(" ");

      form.code.value = course.code;
      form.name.value = course.name;
      form.instructor.value = course.instructor || "";
      form.termSeason.value = termParts[0] || "";
      form.termYear.value = termParts[1] || "";
      form.description.value = course.description || "";
      form.enabled.checked = course.enabled;

      editId = id;
      submitButton.textContent = "Update Course";
      showMessage("Editing course…");
    } catch (err) {
      showMessage("Failed to load course: " + err.message, "error");
    }
  };

  window.deleteCourse = async function (id) {
    if (!confirm("Delete this course and all its assessments?")) return;
    try {
      await apiDeleteCourse(id);
      showMessage("Course deleted successfully.");
      if (editId === id) {
        editId = null;
        submitButton.textContent = "Create Course";
        form.reset();
      }
      await loadCourses();
    } catch (err) {
      showMessage(err.message, "error");
    }
  };

  // Init
  await loadCourses();
});
