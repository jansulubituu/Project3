import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { User } from '../models';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const decodeTokenFromRequest = (req: Request): { id: string; email: string; role: string } | null => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500);
  }

  return jwt.verify(token, jwtSecret) as { id: string; email: string; role: string };
};

// Protect routes - verify JWT token (required)
export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const decoded = decodeTokenFromRequest(req);

    if (!decoded) {
      return next(new AppError('Not authorized, no token', 401));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new AppError('Not authorized, token failed', 401));
  }
};

// Require email verification - check if user has verified their email
// Use this middleware after protect() to enforce email verification
// For routes that should be accessible without verification, use allowUnverified()
export const requireEmailVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    // Get user from database to check email verification status
    const user = await User.findById(req.user.id).select('isEmailVerified isActive');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.isActive) {
      return next(new AppError('Account has been deactivated', 401));
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email verification required',
        message: 'Please verify your email address before accessing this resource.',
        requiresVerification: true,
      });
    }

    next();
  } catch (error) {
    next(new AppError('Error checking email verification', 500));
  }
};

// Allow unverified users - use this to bypass email verification check
// This is useful for routes like verify-otp, resend-otp that need to be accessible before verification
export const allowUnverified = (
  _req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  // This middleware does nothing, it's just a marker
  // Routes using this will not have requireEmailVerification applied
  next();
};

// Optional auth - attach user if token exists, but don't fail if missing/invalid
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const decoded = decodeTokenFromRequest(req);

    if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch {
    // If token invalid, just continue without user
    next();
  }
};

// Authorize specific roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

