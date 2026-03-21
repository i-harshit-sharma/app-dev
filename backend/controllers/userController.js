const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../services/mailService");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d"
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register a user (creates unverified account with OTP)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, passwordConfirm } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim();

    // Validation
    if (!name || !normalizedEmail || !normalizedPhone || !password || !passwordConfirm) {
      return res.status(400).json({ 
        success: false, 
        msg: "Please provide all required fields" 
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ 
        success: false, 
        msg: "Passwords do not match" 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        msg: "Email already in use" 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

    // Create user (unverified)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      isVerified: false,
      otp,
      otpExpiry
    });

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error("Email send failed, but user created:", emailError.message);
    }

    // Send response
    res.status(201).json({
      success: true,
      msg: "Registration successful. Check your email for OTP verification.",
      email: normalizedEmail
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      msg: error.message 
    });
  }
};

// @desc    Verify OTP and activate account
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validation
    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        success: false,
        msg: "Please provide email and OTP"
      });
    }

    // Find user with OTP
    const user = await User.findOne({ email: normalizedEmail }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        msg: "Email already verified"
      });
    }

    // Check if OTP exists and matches
    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({
        success: false,
        msg: "Invalid OTP"
      });
    }

    // Check if OTP expired
    if (new Date() > user.otpExpiry) {
      return res.status(401).json({
        success: false,
        msg: "OTP expired. Request a new one."
      });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.status(200).json({
      success: true,
      msg: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        msg: "Please provide email"
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        msg: "Email already verified"
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error("Email send failed:", emailError.message);
    }

    res.status(200).json({
      success: true,
      msg: "OTP resent to your email"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validation
    if (!normalizedEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        msg: "Please provide email and password" 
      });
    }

    // Check if user exists and get password field
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        msg: "Invalid credentials" 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        msg: "Please verify your email first",
        email: normalizedEmail
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        msg: "Invalid credentials" 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      msg: error.message 
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      msg: error.message 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, password, passwordConfirm } = req.body;

    const user = await User.findById(req.userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Update basic fields if provided
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) {
      const normalizedPhone = phone.trim();
      user.phone = normalizedPhone;
    }

    // Email change: check uniqueness
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const emailExists = await User.findOne({ email: normalizedEmail });
        if (emailExists) {
          return res.status(400).json({ success: false, msg: "Email already in use" });
        }
        user.email = normalizedEmail;
      }
    }

    // Password change: only if both fields supplied
    if (password || passwordConfirm) {
      if (!password || !passwordConfirm) {
        return res.status(400).json({ success: false, msg: "Please provide both new password and confirmation" });
      }
      if (password !== passwordConfirm) {
        return res.status(400).json({ success: false, msg: "Passwords do not match" });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, msg: "Password must be at least 6 characters" });
      }
      user.password = password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};