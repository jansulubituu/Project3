import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

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

