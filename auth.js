const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./user");

const router = express.Router();

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  donor: user.donor,
});

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not logged in" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Session expired, please log in again" });
  }
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/role", auth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["donor", "recipient"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const user = await User.findByIdAndUpdate(req.userId, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/donor-profile", auth, async (req, res) => {
  try {
    const fields = [
      "dob", "bloodGroup", "gender", "weight", "phone",
      "house", "street", "city", "state", "pincode",
      "lastDonationDate", "firstTime", "chronicIllness",
      "medication", "tattooRecent",
    ];

    const set = { role: "donor", "donor.completed": true };
    for (const f of fields) {
      if (req.body[f] !== undefined) set[`donor.${f}`] = req.body[f];
    }
    if (req.body.fullName && req.body.fullName.trim()) {
      set.name = req.body.fullName.trim();
    }

    if (!req.body.bloodGroup || !req.body.phone || !req.body.city)
      return res.status(400).json({ message: "Blood group, phone and city are required" });

    const user = await User.findByIdAndUpdate(req.userId, { $set: set }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;