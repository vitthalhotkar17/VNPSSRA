const START_ENROLLMENT_NO = '24212620101';
const ENROLLMENT_NO_REGEX = /^\d{11}$/;

function getNextEnrollmentNo(currentEnrollmentNo = null) {
  if (!currentEnrollmentNo || typeof currentEnrollmentNo !== 'string') {
    return START_ENROLLMENT_NO;
  }

  const trimmed = currentEnrollmentNo.trim();
  if (!ENROLLMENT_NO_REGEX.test(trimmed)) {
    return START_ENROLLMENT_NO;
  }

  const nextValue = BigInt(trimmed) + 1n;
  return nextValue.toString().padStart(11, '0');
}

async function assignMissingEnrollmentNumbers(UserModel) {
  if (!UserModel || typeof UserModel.find !== 'function') {
    return [];
  }

  const students = await UserModel.find({ role: 'student' })
    .sort({ createdAt: 1, _id: 1 })
    .select('enrollmentNo');

  const validEnrollmentNumbers = students
    .map((student) => String(student.enrollmentNo || '').trim())
    .filter((value) => ENROLLMENT_NO_REGEX.test(value));

  const highestExistingEnrollment = validEnrollmentNumbers
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => b - a)[0];

  let nextEnrollmentNo = highestExistingEnrollment
    ? getNextEnrollmentNo(String(highestExistingEnrollment))
    : START_ENROLLMENT_NO;

  const usedNumbers = new Set(validEnrollmentNumbers);
  const assignments = [];

  for (const student of students) {
    const currentEnrollmentNo = String(student.enrollmentNo || '').trim();
    const currentIsValid = ENROLLMENT_NO_REGEX.test(currentEnrollmentNo);
    const shouldAssign = !currentIsValid || usedNumbers.has(currentEnrollmentNo);

    let assignedEnrollmentNo = currentEnrollmentNo;
    if (shouldAssign) {
      while (usedNumbers.has(nextEnrollmentNo)) {
        nextEnrollmentNo = getNextEnrollmentNo(nextEnrollmentNo);
      }
      assignedEnrollmentNo = nextEnrollmentNo;
      nextEnrollmentNo = getNextEnrollmentNo(nextEnrollmentNo);
    }

    usedNumbers.add(assignedEnrollmentNo);

    if (shouldAssign || currentEnrollmentNo !== assignedEnrollmentNo) {
      assignments.push({ id: student._id, enrollmentNo: assignedEnrollmentNo });
    }
  }

  await Promise.all(
    assignments.map(({ id, enrollmentNo }) =>
      UserModel.findByIdAndUpdate(id, { enrollmentNo })
    )
  );

  return assignments;
}

module.exports = {
  START_ENROLLMENT_NO,
  ENROLLMENT_NO_REGEX,
  getNextEnrollmentNo,
  assignMissingEnrollmentNumbers,
};
