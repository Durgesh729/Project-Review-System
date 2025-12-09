// Simple auth middleware for development
// In production, use proper JWT tokens
const auth = (req, res, next) => {
  try {
    // For now, we'll use a simple user object from headers or session
    // In a real app, verify JWT token here
    const userId = req.headers['x-user-id'] || req.body.userId;
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    
    if (!userId) {
      // For development, allow requests without auth
      // but attach a default user
      req.user = {
        _id: 'default-user-id',
        role: 'mentee',
        email: 'default@example.com'
      };
      return next();
    }
    
    req.user = {
      _id: userId,
      role: userRole || 'mentee',
      email: req.headers['x-user-email'] || 'user@example.com'
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = auth;
