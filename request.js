const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },
    address: { type: String, required: true, trim: true },
    urgency: { type: String, enum: ["Normal", "Urgent", "Immediate"], default: "Normal" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Accepted", "Declined"], default: "Pending" },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);