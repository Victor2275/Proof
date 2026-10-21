import crypto from 'crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** token -> { createdAt: number } */
const activeSessions = new Map();

export const generateToken = () => crypto.randomUUID();

export const isValidSession = (token) => {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  return true;
};

export const createSession = () => {
  const token = generateToken();
  activeSessions.set(token, { createdAt: Date.now() });
  return token;
};

/*
 * The site operator: moderation, backups, takedowns. Not a user role — the PIN
 * proves it. With no ADMIN_PIN set (local development) every caller is the
 * operator.
 */
export const requireOperator = (req, res, next) => {
  if (!process.env.ADMIN_PIN) { next(); return; }
  const token = req.headers.authorization?.split(' ')[1];
  if (isValidSession(token)) {
    next();
  } else {
    res.status(401).json({ error: 'That needs the operator PIN.' });
  }
};
