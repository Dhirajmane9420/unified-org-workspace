import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken } from './middlewares/auth.js';
import { tenantGuard } from './middlewares/tenantGuard.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import pullRequestRoutes from './routes/pullRequests.js';
import auditRoutes from './routes/audit.js';

// Load environmental credentials
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. GLOBAL MIDDLEWARES
app.use(express.json());

// Dynamic CORS configuration mapping to your dual-dashboard routes
const allowedOrigins = [
  process.env.FRONTEND_SUPPORT_URL || 'http://localhost:3000',
  process.env.FRONTEND_REVIEW_URL || 'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or internal postman testing)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Blocked by Cross-Origin Resource Sharing Policy'));
    }
  },
  credentials: true
}));

// 2. HEALTH CHECK ROUTE
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});


app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/tickets', ticketRoutes);

// Pull Request Module Service Routes (Dashboard 2)
app.use('/api/v1/pull-requests', pullRequestRoutes);

// Audit Log Historical Module Service Routes (Dashboard 2)
app.use('/api/v1/audit-logs', auditRoutes);


// 3. SECURED SYSTEM TEST ROUTE
// Verifies that your single identity layer and tenant guards function seamlessly
app.get('/api/v1/protected-workspace', verifyToken, tenantGuard, (req, res) => {
  res.status(200).json({
    message: 'Access granted. Operational security context verified.',
    user: req.user,
    activeOrgId: req.activeOrgId,
    currentRole: req.currentRole
  });
});

// 4. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('❌ Server Error Context:', err.message);
  res.status(500).json({ error: 'Internal server operational error occurred' });
});

// 5. BOOT ENGINE
app.listen(PORT, () => {
  console.log(`🚀 Unified Org Workspace backend spinning up on port ${PORT}`);
  console.log(`🔗 Scoped Origins: Support [${allowedOrigins[0]}], Review [${allowedOrigins[1]}]`);
});

export default app;
