const express = require("express");
const Request = require("./request");
const User = require("./user");
const { auth } = require("./auth");

const router = express.Router();

const publicRequest = (r) => ({
  id: r._id,
  patientName: r.patientName,
  bloodGroup: r.bloodGroup,
  units: r.units,
  address: r.address,
  urgency: r.urgency,
  message: r.message,
  status: r.status,
  createdAt: r.createdAt,
});

// Donor ki chupinche format (contact details accept chesaka matrame)
const toItem = (r, userId) => {
  const mine = r.acceptedBy && String(r.acceptedBy) === String(userId);
  const item = {
    id: r._id,
    bloodGroup: r.bloodGroup,
    units: r.units,
    urgency: r.urgency,
    hospital: r.address,
    patientName: r.patientName,
    message: r.message,
    postedAt: r.createdAt,
    status: mine ? "accepted" : null,
  };
  if (mine && r.receiver) {
    item.receiverName = r.receiver.name;
    item.receiverEmail = r.receiver.email;
    item.receiverPhone = r.receiver.phone || "Not provided";
  }
  return item;
};

// Receiver kotta request pampadam
router.post("/", auth, async (req, res) => {
  try {
    const { patientName, bloodGroup, units, address, urgency, message } = req.body;
    if (!patientName || !bloodGroup || !units || !address)
      return res
        .status(400)
        .json({ message: "Patient name, blood group, units and address are required" });

    const request = await Request.create({
      receiver: req.userId,
      patientName,
      bloodGroup,
      units,
      address,
      urgency,
      message,
    });
    res.status(201).json({ request: publicRequest(request) });
  } catch (err) {
    if (err.name === "ValidationError")
      return res.status(400).json({ message: "Invalid request details" });
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Receiver tana requests chudadam
router.get("/mine", auth, async (req, res) => {
  try {
    const requests = await Request.find({ receiver: req.userId }).sort({ createdAt: -1 });
    res.json({ requests: requests.map(publicRequest) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Donor ki tana blood group match ayye requests
router.get("/donor", auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const bloodGroup = me?.donor?.bloodGroup;
    if (!bloodGroup)
      return res.status(400).json({ message: "Please complete your donor profile first" });

    const list = await Request.find({
      bloodGroup,
      receiver: { $ne: req.userId },
      declinedBy: { $ne: req.userId },
      $or: [{ status: "Pending" }, { acceptedBy: req.userId }],
    })
      .populate("receiver", "name email")
      .sort({ createdAt: -1 });

    res.json({ requests: list.map((r) => toItem(r, req.userId)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Donor accept / reject
router.put("/:id/respond", auth, async (req, res) => {
  try {
    const { decision } = req.body;
    if (!["accepted", "reject"].includes(decision))
      return res.status(400).json({ message: "Invalid