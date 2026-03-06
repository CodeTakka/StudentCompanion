class Course {
  constructor(
    code,
    name,
    instructor,
    term,
    description = "",
    enabled = true,
    assessments = [],
  ) {
    this.code = code;
    this.name = name;
    this.instructor = instructor;
    this.term = term;
    this.description = description;
    this.enabled = enabled;
    this.assessments = [];
  }

  addAssessment(assessment) {
    this.assessments.push(assessment);
  }

  removeAssessment(index) {
    this.assessments.splice(index, 1);
  }

  calculateCurrentAverage() {
    let total = 0;

    for (let assessment of this.assessments) {
      total += assessment.getWeightedContribution();
    }

    // 2 decimal places
    return total.toFixed(2);
  }

  getCompletionRate() {
    if (this.assessments.length === 0) {
      return 0;
    }

    let completedCount = 0;

    for (let assessment of this.assessments) {
      if (assessment.completed === true) {
        completedCount++;
      }
    }

    const percentage = (completedCount / this.assessments.length) * 100;

    return percentage.toFixed(0);
  }
}

class CourseTemplate {
  constructor(code, name, assessments = []) {
    this.code = code;
    this.name = name;
    this.assessments = assessments; // Array of Assessment objects
  }

  clone() {
    const clonedAssessments = [];

    for (let assessment of this.assessments) {
      clonedAssessments.push(assessment.clone());
    }

    return new Course(
      this.code,
      this.name,
      "", // instructor placeholder
      "", // term placeholder
      "", // description placeholder
      true,
      clonedAssessments,
    );
  }
}
