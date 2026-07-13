const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    sessionDuration: { type: Number, default: 30 },
    gpsRadius: { type: Number, default: 500 },
    campusLat: { type: Number, default: null },
    campusLng: { type: Number, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
