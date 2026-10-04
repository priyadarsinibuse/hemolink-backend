const express = require("express");
const Request = require("./requests");
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

// Donors anni Pending requests chudadam
router.get("/", auth, async (req, res) => {
  try {
    const filter = { status: "Pending" };

    // TODO (nee mini task): bloodGroup, urgency filters ikkada add cheyyi

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json({ requests: requests.map(publicRequest) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;