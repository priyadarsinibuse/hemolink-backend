const express = require("express");
const User = require("./user");
const { auth } = require("./auth");

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Receiver donors ni search cheyyadam (contact details share cheyyam)
router.get("/", auth, async (req, res) => {
  try {
    const filter = {
      _id: { $ne: req.userId },
      "donor.bloodGroup": { $exists: true, $ne: "" },
    };

    if (req.query.bloodGroup) {
      filter["donor.bloodGroup"] = req.query.bloodGroup;
    }
    if (req.query.city && req.query.city.trim()) {
      filter["donor.city"] = new RegExp(escapeRegex(req.query.city.trim()), "i");
    }

    const users = await User.find(filter).limit(50);

    const donors = users.map((u) => ({
      id: u._id,
      name: u.name,
      bloodGroup: u.donor.bloodGroup,
      city: u.donor.city || "",
    }));

    res.json({ donors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;