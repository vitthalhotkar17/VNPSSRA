const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFacultyStudentFilter, isFacultyAllowedForDepartment, buildFacultyDepartmentQuery } = require('../src/utils/departmentAccess');

test('faculty filter is scoped to the assigned department', () => {
  const faculty = { role: 'faculty', department: 'COMP' };
  const filter = buildFacultyStudentFilter(faculty, { semester: 5 });

  assert.deepStrictEqual(filter, { semester: 5, role: 'student', department: 'COMP' });
});

test('faculty cannot access a different department', () => {
  const faculty = { role: 'faculty', department: 'COMP' };
  assert.equal(isFacultyAllowedForDepartment(faculty, 'COMP'), true);
  assert.equal(isFacultyAllowedForDepartment(faculty, 'IT'), false);
});

test('faculty department query matches department names and ids', () => {
  const query = buildFacultyDepartmentQuery({ _id: '507f1f77bcf86cd799439011', name: 'Computer Science', code: 'CS' });

  assert.ok(query.$or);
  assert.equal(query.$or[0].department.$in[0].toString(), '507f1f77bcf86cd799439011');
  assert.deepStrictEqual(query.$or[1].department.$in, ['Computer Science', 'CS']);
});
