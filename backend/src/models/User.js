const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    contact: {
      type: String,
      trim: true,
      default: "N/A",
    },

    role: {
      type: String,
      enum: ["admin", "faculty", "student"],
      default: "student",
    },

    rollNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    enrollmentNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    year: {
      type: Number,
    },

    semester: {
      type: String,
      trim: true,
    },

    division: {
      type: String,
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    profileImage: {
      type: String,
      default: null,
    },

    faceImage: {
      type: String,
      default: null,
    },

    faceEmbeddings: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      select: false,
    },

    faceSignature: {
      type: [Number],
      default: [],
    },

    // Academic Year — for students
    academicYear: {
      type: String,
      enum: ["First Year", "Second Year", "Third Year", "Fourth Year"],
      default: null,
    },

    // Assigned Academic Years — for faculty
    assignedYears: {
      type: [String],
      enum: ["First Year", "Second Year", "Third Year", "Fourth Year"],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ academicYear: 1 });
userSchema.index({ assignedYears: 1 });


// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields
userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    delete ret.faceEmbeddings;
    delete ret.faceSignature;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);