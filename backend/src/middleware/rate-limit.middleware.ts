import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication routes.
 * Prevents brute-force attacks on login endpoint.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  skipSuccessfulRequests: false,
});

/**
 * General API rate limiter for admin routes.
 * Prevents abuse of management endpoints.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

/**
 * Order placement rate limiter.
 * Prevents customers from flooding the order system.
 */
export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});
