/**
 * Role-Based Access Control Gatekeeper Middleware
 * @param {string[]} allowedRoles - Array of roles allowed to pass this guard
 */
export const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    // req.currentRole is populated dynamically by the upstream tenantGuard middleware
    const userRole = req.currentRole;

    if (!userRole) {
      return res.status(403).json({ error: 'Access Denied: No tenant role context established.' });
    }

    // Platform Super Admin bypasses all localized tenant checks
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if the user's active role is explicitly allowed for this endpoint scope
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      error: `Access Denied: Current role [${userRole}] does not have permission to execute this action.` 
    });
  };
};