// Run: node debugDepartments.js
// Purpose: print every user's department value + type so you can confirm
// whether faculty and student `department` fields are stored consistently.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User"); // adjust path if needed

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const faculty = await User.find({ role: "faculty" }).select("name department").lean();
  const students = await User.find({ role: "student" }).select("name department").lean();

  console.log("=== FACULTY ===");
  faculty.forEach((f) =>
    console.log(f.name, "→", JSON.stringify(f.department), "|", typeof f.department)
  );

  console.log("\n=== STUDENTS ===");
  students.forEach((s) =>
    console.log(s.name, "→", JSON.stringify(s.department), "|", typeof s.department)
  );

  process.exit();
}

run();
