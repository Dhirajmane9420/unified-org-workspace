import express from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { register, login, logout, getFeatureFlags } from '../controllers/auth.js';

const router = express.Router();

// Public onboarding routes
router.post('/register', register);
router.post('/login', login);

// Session clearance routes
router.post('/logout', verifyToken, logout);

// Per-tenant configuration data route
router.get('/feature-flags', verifyToken, tenantGuard, getFeatureFlags);

export default router;