import { Request, Response } from 'express';
import { User } from '../models';
import crypto from 'crypto';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role } = req.body;

    // Normalize email (lowercase, trim)
    const normalizedEmail = email?.toLowerCase().trim();

    // Validate email format (additional check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
        field: 'email',
      });
    }

    // Validate password strength
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        field: 'password',
      });
    }

    // Optional: Check password strength (at least one letter and one number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one letter and one number',
        field: 'password',
      });
    }

    // Validate fullName
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Full name must be at least 2 characters long',
        field: 'fullName',
      });
    }

    if (fullName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Full name cannot exceed 100 characters',
        field: 'fullName',
      });
    }

    // Validate role (only student or instructor allowed for public registration)
    const validRoles = ['student', 'instructor'];
    const userRole = role || 'student';
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Only student or instructor roles are allowed',
        field: 'role',
      });
    }

    // Check if user exists (case-insensitive)
    const existingUser = await User.findOne({ 
      email: normalizedEmail 
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        field: 'email',
        message: 'An account with this email already exists. Please use a different email or try logging in.',
      });
    }

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password, // Will be hashed by pre-save hook
      fullName: fullName.trim(),
      role: userRole,
      isEmailVerified: false, // Will be verified with OTP
      isActive: true,
    });

    // Generate 6-digit OTP
    const otp = user.generateEmailOTP();
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, fullName.trim(), otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Don't fail registration if email fails, but log it
      // In production, you might want to queue the email or handle differently
    }

    // Generate token (but user can't access protected routes until verified)
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP verification code.',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      requiresVerification: true,
      // Include OTP in development mode only (remove in production)
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle MongoDB duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        field: 'email',
        message: 'An account with this email already exists.',
      });
    }

    // Handle validation errors from Mongoose
    if (error instanceof Error && error.name === 'ValidationError') {
      const mongooseError = error as any;
      const firstError = mongooseError.errors 
        ? Object.values(mongooseError.errors)[0] as { message: string; path: string }
        : null;
      
      return res.status(400).json({
        success: false,
        error: firstError?.message || 'Validation error',
        field: firstError?.path,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error during registration. Please try again later.',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error'
        : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Check user exists and select password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        headline: user.headline,
        website: user.website,
        social: user.social,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (_req: Request, res: Response) => {
  try {
    // For JWT, logout is handled on client side by removing token
    // You can implement token blacklist here if needed
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during logout',
    });
  }
};

// @desc    Forgot password - Send reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with that email',
      });
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, return token in response (ONLY FOR DEVELOPMENT!)
    // In production, this should be sent via email only
    
    res.json({
      success: true,
      message: 'Password reset token sent to email',
      // Remove this in production:
      resetToken: resetToken, // Only for development testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a new password',
      });
    }

    // Hash token from params to match with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Generate new token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Password reset successful',
      token,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Hash token to match with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password',
      });
    }

    // Get user with password
    const user = await User.findById(req.user?.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Password updated successfully',
      token,
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-otp
// @access  Private
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: 'Please provide OTP code',
      });
    }

    // Get user
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
      });
    }

    // Check if OTP exists and not expired
    if (!user.emailOTP || !user.emailOTPExpires) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.',
      });
    }

    if (user.emailOTPExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.',
      });
    }

    // Hash the provided OTP to compare
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    if (hashedOTP !== user.emailOTP) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code',
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.fullName);

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Private
export const resendOTP = async (req: Request, res: Response) => {
  try {
    // Get user
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
      });
    }

    // Generate new OTP
    const otp = user.generateEmailOTP();
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, user.fullName, otp);

    res.json({
      success: true,
      message: 'OTP has been resent to your email',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

