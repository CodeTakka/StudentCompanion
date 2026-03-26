let selectedCourseId = null;
let editingId        = null; // assessment _id being edited, null = creating new

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Course selector
async function loadCourseSelector() {
  const select = document.getElementById('courseSelect');
  try {
    const courses = await apiGetCourses();
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c._id;
      opt.textContent = `${c.code} — ${c.name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load courses:', err);
  }
}

document.getElementById('courseSelect').addEventListener('change', function () {
  selectedCourseId = this.value;
  const panel = document.getElementById('assessmentPanel');
  if (selectedCourseId) {
    panel.style.display = 'block';
    loadAssessments();
  } else {
    panel.style.display = 'none';
  }
  hideForm();
});

// Load assessments
async function loadAssessments() {
  const tbody = document.getElementById('assessmentTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">Loading…</td></tr>';
  try {
    const assessments = await apiGetAssessments(selectedCourseId);
    if (!assessments.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">No assessments yet.</td></tr>';
      return;
    }
    tbody.innerHTML = assessments.map(a => `
      <tr>
        <td>${a.name}</td>
        <td>${a.type}</td>
        <td>${formatDate(a.dueDate)}</td>
        <td>${a.totalMarks ?? '—'}</td>
        <td>${Math.round(a.weight * 100)}%</td>
        <td>${a.visible ? '✓' : '✗'}</td>
        <td>
          <button class="btn small" onclick="editAssessment('${a._id}')">Edit</button>
          <button class="btn small danger" onclick="deleteAssessment('${a._id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b">${err.message}</td></tr>`;
  }
}

// Form show/hide
window.showAddForm = function () {
  editingId = null;
  document.getElementById('formTitle').textContent   = 'Add Assessment';
  document.getElementById('formSubmitBtn').textContent = 'Add';
  document.getElementById('aName').value      = '';
  document.getElementById('aType').value      = 'Quiz';
  document.getElementById('aDueDate').value   = '';
  document.getElementById('aWeight').value    = '';
  document.getElementById('aTotalMarks').value = '';
  document.getElementById('aVisible').checked  = true;
  document.getElementById('formMessage').textContent = '';
  document.getElementById('assessmentForm').style.display = 'block';
};

window.hideForm = function () {
  // Leaves it in the dom but hides it from view and prevents it from taking up space
  document.getElementById('assessmentForm').style.display = 'none';
  editingId = null;
};

window.editAssessment = async function (id) {
  try {
    // Find the assessment from the already-loaded list to avoid an extra request
    const assessments = await apiGetAssessments(selectedCourseId);
    const a = assessments.find(assessment => assessment._id === id);
    // Leave if it isn't part of the list
    if (!a) return;

    editingId = id;
    document.getElementById('formTitle').textContent    = 'Edit Assessment';
    document.getElementById('formSubmitBtn').textContent = 'Save';
    document.getElementById('aName').value       = a.name;
    document.getElementById('aType').value       = a.type;
    // Slices YYYY-MM-DDTHH:mm:ss.sssZ to YYYY-MM-DD (first 10 characters)
    document.getElementById('aDueDate').value    = a.dueDate ? a.dueDate.slice(0, 10) : '';
    document.getElementById('aWeight').value     = Math.round(a.weight * 100);
    // This is used instead of a ? because a 0 would be considered falsy with a ?
    if (a.totalMarks !== null && a.totalMarks !== undefined) {
        document.getElementById('aTotalMarks').value = a.totalMarks;
    } else {
        document.getElementById('aTotalMarks').value = '';
    }
    document.getElementById('aVisible').checked  = a.visible;
    document.getElementById('formMessage').textContent = '';
    document.getElementById('assessmentForm').style.display = 'block';
  } catch (err) {
    alert('Failed to load assessment: ' + err.message);
  }
};

// Submit
window.submitAssessmentForm = async function () {
  const msg = document.getElementById('formMessage');
  msg.textContent = '';

  const name       = document.getElementById('aName').value.trim();
  const type       = document.getElementById('aType').value;
  const dueDate    = document.getElementById('aDueDate').value;
  const weight     = parseFloat(document.getElementById('aWeight').value);
  const totalMarks = parseFloat(document.getElementById('aTotalMarks').value);
  const visible    = document.getElementById('aVisible').checked;

  if (!name || !type || isNaN(weight)) {
    msg.textContent = 'Name, type, and weight are required.';
    return;
  }
  if (weight < 0 || weight > 100) {
    msg.textContent = 'Weight must be between 0 and 100.';
    return;
  }

  const payload = {
    courseId: selectedCourseId,
    name, type, visible,
    weight,                                        // api.js converts >1 to decimal
    dueDate:    dueDate || null,
    totalMarks: isNaN(totalMarks) ? null : totalMarks
  };

  try {
    if (editingId) {
      await apiUpdateAssessment(editingId, payload);
    } else {
      await apiCreateAssessment(payload);
    }
    hideForm();
    loadAssessments();
  } catch (err) {
    msg.textContent = err.message;
  }
};

// Delete
window.deleteAssessment = async function (id) {
  if (!confirm('Delete this assessment?')) return;
  try {
    await apiDeleteAssessment(id);
    loadAssessments();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
};

// Init
loadCourseSelector();