import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user has required role
 * @param roles - Array of allowed roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const adminOnly = authorize('admin');

/**
 * Middleware to check if user is instructor or admin
 */
export const instructorOrAdmin = authorize('instructor', 'admin');

