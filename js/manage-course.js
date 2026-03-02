document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("createCourseForm");
    const messageDiv = document.getElementById("message");
    const submitButton = document.getElementById("submitCourseButton");

    document.getElementById("sampleCourse").addEventListener("click", function() {
        createSampleCourse();
        displayCourses();  
    });

    let courses = [];
    let editIndex = null; // Index of courses (e.g., The first course created has an index of 0)

    const requiredFields = [
        { name: "code", label: "Course Code" },
        { name: "name", label: "Course Name" },
        { name: "instructor", label: "Instructor Name" },
        { name: "termSeason", label: "Term/Season" },
        { name: "termYear", label: "Year" }
    ];

    function validateForm() {
        let isValid = true;
        const errors = []; // collect all error messages

        // Clear previous highlights
        const inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach(input => input.classList.remove("error-field"));

        requiredFields.forEach(field => {
            const input = form.querySelector("[name=" + field.name + "]");
            if (!input) {
                console.warn("Field " + field.name + " not found");
                return;
            }

            // Check if empty
            if (!input.value.trim()) {
                input.classList.add("error-field");
                isValid = false;
                errors.push("Please fill " + field.label);
            }

            // Extra check for termYear
            if (field.name === "termYear") {
                const year = Number(input.value);
                if (isNaN(year) || year < 1900 || year > 2100) {
                    input.classList.add("error-field");
                    isValid = false;
                    errors.push("Year must be a number between 1900 and 2100");
                }
            }
        });

        if (!isValid) {
            messageDiv.className = "message error";
            // Joins errors with line breaks for readability
            messageDiv.innerHTML = errors.join("<br>");
        }

        return isValid;
    }

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        // Stops the submit event listener if the form isn't valid
        if (!validateForm()) return;

        const code = form.code.value.trim();
        const courseName = form.name.value.trim();
        const instructor = form.instructor.value.trim();
        const termSeason = form.termSeason.value;
        const termYear = form.termYear.value;
        const description = form.description.value.trim();
        const enabled = form.enabled.checked;

        const term = termSeason + " " + termYear;

        messageDiv.className = "message success";

        /* If editIndex is null, that means the course information
        was null, so that would mean a new course is being created */
        if (editIndex !== null) {

            const course = courses[editIndex];

            /* course is constant, so its size is not changeable
               but the elements inside of it are changeable */ 
            course.code = code;
            course.name = courseName;
            course.instructor = instructor;
            course.term = term;
            course.description = description;
            course.enabled = enabled;

            messageDiv.textContent = "Course updated successfully!";
            submitButton.textContent = "Create Course";
            editIndex = null;

        }
        
        else {

            const newCourse = new Course(
                code,
                courseName,
                instructor,
                term,
                description,
                enabled,
                50 // hardcoded progress of 50%, will be changed in deliverable 2
            );

            courses.push(newCourse);

            messageDiv.textContent = "Course created successfully!";
        }

        displayCourses();
        form.reset();
    });

    function displayCourses() {
        const list = document.getElementById("courseList");
        list.innerHTML = "";

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];

            list.innerHTML +=
                // If course isn't enabled, add the disabled class to it 
                "<div class='course-card" + (!course.enabled ? " disabled" : "") + "'>" +
                    "<div class='course-title'>" +
                        course.code + " - " + course.name +
                    "</div>" +
                    "<div>" +
                        course.instructor + " | " + course.term +
                    "</div>" +
                    "<div>" + 
                    course.description + 
                    "</div>" +
                    "<div class='course-actions'>" +
                        "<button onclick='editCourse(" + i + ")'>Edit</button>" +
                        "<button onclick='deleteCourse(" + i + ")'>Delete</button>" +
                    "</div>" +
                "</div>";
        }
    }

    function createSampleCourse() {
        const sampleTerm = {
            season: 'Winter',
            year: '2026'
        };
        
        const sampleCourse = new Course(
            'COMP249',
            'Object-Oriented Programming II',
            'Dr. Dargham',
            sampleTerm.season + ' ' + sampleTerm.year, 
            'Intermediate to advanced programming topics like inheritance' +
            ', polymorphism, exception handling, I/O, and more.',
            true
        );
        
        courses.push(sampleCourse);
                        
        messageDiv.className = "message success";
        messageDiv.textContent = 'Course created successfully';
    
    }

    window.editCourse = function(index) {
        submitButton.textContent = "Update Course";

        const course = courses[index];

        form.code.value = course.code;
        form.name.value = course.name;
        form.instructor.value = course.instructor;

        const termParts = course.term.split(" ");
        form.termSeason.value = termParts[0];
        form.termYear.value = termParts[1];

        form.description.value = course.description;
        form.enabled.checked = course.enabled;

        editIndex = index;

        messageDiv.className = "message";
        messageDiv.textContent = "Editing course...";
        
    };

    window.deleteCourse = function(index) {
        submitButton.textContent = "Create Course";

        courses.splice(index, 1);
        displayCourses();

        messageDiv.className = "message success";
        messageDiv.textContent = "Course deleted successfully.";
    };


});
