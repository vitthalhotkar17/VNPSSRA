const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');

test('student registration should not fail when contact is omitted', () => {
  const user = new User({
    name: 'Test Student',
    email: 'student@example.com',
    password: 'secret123',
    role: 'student',
    rollNo: 'CS1001',
    department: 'Computer Science',
  });

  const error = user.validateSync();
  assert.equal(error, undefined);
});
