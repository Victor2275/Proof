import crypto from 'crypto';
import { RequestHandler, Request, Response, NextFunction } from 'express';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** token -> { createdAt: number } */
const activeSessions = new Map<string, { createdAt: number }>();

export const generateToken = (): string => crypto.randomUUID();

export const isValidSession = (token: string | undefined): boolean => {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  return true;
};

export const createSession = (): string => {
  const token = generateToken();
  activeSessions.set(token, { createdAt: Date.now() });
  return token;
};

export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (!process.env.ADMIN_PIN) { next(); return; }
  const token = req.headers.authorization?.split(' ')[1];
  if (isValidSession(token)) {
    next();
  } else {
    res.status(401).json({ error: 'Admin authentication required.' });
  }
};
