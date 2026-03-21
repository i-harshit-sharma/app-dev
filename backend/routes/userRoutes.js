const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  register,
  login,
  verifyOtp,
  resendOtp,
  getMe,
  updateProfile,
  createUser,
  getUsers
} = require("../controllers/userController");

// Auth routes
router.post("/auth/register", register);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/resend-otp", resendOtp);
router.post("/auth/login", login);
router.get("/auth/me", protect, getMe);
router.put("/auth/profile", protect, updateProfile);

// User routes
router.post("/users", createUser);
router.get("/users", getUsers);

module.exports = router;