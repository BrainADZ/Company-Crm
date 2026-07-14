const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (!decoded.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(decoded.user.id).select('role crmRole permissions communities email name');
    if (!user) return res.status(403).json({ message: 'User no longer exists' });

    req.user = {
      id: String(user._id),
      role: user.role,
      crmRole: user.crmRole || (user.role === 'admin' ? 'super_admin' : 'employee'),
      permissions: user.permissions || [],
      communities: user.communities || [],
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    res.status(403).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
