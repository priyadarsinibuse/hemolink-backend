const express = require("express");
const Request = require("./request");
const User = require("./user");
const { auth } = require("./auth");

const router = express.Router();
const normBG = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "");

// Receiver ki chupinche format (donor details populate ayite matrame)
const publicRequest = (r) => {
  const d = r.acceptedBy && r.acceptedBy.name ? r.acceptedBy : null;
  return {
    id: r._id,
    patientName: r.patientName,
    bloodGroup: r.bloodGroup,
    units: r.units,
    address: r.address,
    urgency: r.urgency,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    completedAt: r.completedAt,
    donorName: d?.name,
    donorPhone: d?.donor?.phone,
  };
};

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
    status: mine ? (r.status === "Completed" ? "completed" : "accepted") : null,
  };
  if (mine && r.receiver) {
    item.receiverName = r.receiver.name;
    item.receiverEmail = r.receiver.email;
    item.receiverPhone = r.receiver.recipient?.phone || "Not provided";
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
    const requests = await Request.find({ receiver: req.userId })
      .populate("acceptedBy", "name donor")
      .sort({ createdAt: -1 });
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
    const bloodGroup = normBG(me?.donor?.bloodGroup);
    if (!bloodGroup)
      return res.status(400).json({ message: "Please complete your donor profile first" });

    const all = await Request.find({
      receiver: { $ne: req.userId },
      declinedBy: { $ne: req.userId },
      $or: [{ status: "Pending" }, { acceptedBy: req.userId }],
    })
      .populate("receiver", "name email recipient")
      .sort({ createdAt: -1 });

    const list = all.filter((r) => normBG(r.bloodGroup) === bloodGroup);

    console.log("DONOR REQ:", me.email, bloodGroup, "candidates:", all.length, "matched:", list.length);

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
      return res.status(400).json({ message: "Invalid decision" });

    if (decision === "reject") {
      await Request.findByIdAndUpdate(req.params.id, {
        $addToSet: { declinedBy: req.userId },
      });
      return res.json({ ok: true });
    }

    const updated = await Request.findOneAndUpdate(
      { _id: req.params.id, status: "Pending", receiver: { $ne: req.userId } },
      { status: "Accepted", acceptedBy: req.userId },
      { new: true }
    ).populate("receiver", "name email recipient");

    if (!updated)
      return res.status(409).json({ message: "This request is no longer available" });

    res.json({ request: toItem(updated, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Donor "Mark as donated"
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const updated = await Request.findOneAndUpdate(
      { _id: req.params.id, status: "Accepted", acceptedBy: req.userId },
      { status: "Completed", completedAt: new Date() },
      { new: true }
    );

    if (!updated)
      return res
        .status(409)
        .json({ message: "Request is not accepted by you or already completed" });

    await User.findByIdAndUpdate(req.userId, {
      $inc: { "donor.donationsCount": 1 },
      $set: { "donor.lastDonationDate": new Date().toISOString().slice(0, 10) },
    });

    res.json({ ok: true, status: "completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Anni Pending requests (optional filters: ?bloodGroup=O+&urgency=Urgent)
router.get("/", auth, async (req, res) => {
  try {
    const filter = { status: "Pending" };
    if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
    if (req.query.urgency) filter.urgency = req.query.urgency;

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json({ requests: requests.map(publicRequest) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;