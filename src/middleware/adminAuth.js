const config = require('../config');

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="F1 Pulse Admin"');
    return res.status(401).send('Authentication required');
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const [user, password] = decoded.split(':');

  if (user === config.admin.user && password === config.admin.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="F1 Pulse Admin"');
  return res.status(401).send('Invalid credentials');
}

module.exports = adminAuth;
