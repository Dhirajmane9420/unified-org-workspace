import jwt from 'jsonwebtoken';
import { isTokenRevoked } from '../services/session.js';

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const isRevoked = await isTokenRevoked(token);
    if (isRevoked) {
      return res.status(401).json({ error: 'Token has been revoked globally' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    req.activeOrgId = req.headers['x-active-org-id']; // Standard context switcher target
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token validation signature' });
  }
}