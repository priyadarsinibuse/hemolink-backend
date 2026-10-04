const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["donor", "recipient"] },
          donor: {
      dob: String,
      bloodGroup: String,
      gender: String,
      weight: Number,
      phone: String,
      house: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      lastDonationDate: String,
      firstTime: String,
      chronicIllness: String,
      medication: String,
      tattooRecent: String,
      available: { type: Boolean, default: true },
      completed: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);