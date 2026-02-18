class Assessment {
    constructor(name, weight, dueDate = null, visible = false, completed = false) {
        this.name = name;
        this.weight = Math.min(weight, 1); // Ensure weight cannot exceed 1
        this.dueDate = dueDate;
        this.visible = visible;
        this.completed = completed;
    }

    toggleCompleted() {
        this.completed = !this.completed;
    }

    // Clone method: returns a new Assessment instance with the same properties
    clone() {
        return new Assessment(
            this.name,
            this.weight,
            this.dueDate,
            this.visible,
            this.completed
        );
    }

    // Calculate weighted grade
    calculateGrade(grade) {
        const safeGrade = Math.min(grade, 100);  // grade cannot exceed 100
        const safeWeight = Math.min(this.weight, 1);  // weight cannot exceed 1
        return safeGrade * safeWeight;
    }
}

// Helper function to create sample assessments
function createSampleAssessments() {
    return [
        new Assessment("Assignment", 0.1),
        new Assessment("Quiz", 0.2),
        new Assessment("Midterm Exam", 0.2),
        new Assessment("Final Exam", 0.5)
    ];
}

/* Example usage :
const a1 = new Assessment("Project", 0.25);
const a2 = a1.clone();
console.log(a2); // same as a1
console.log(a1.calculateGrade(90)); // 90 * 0.25 = 22.5
*/