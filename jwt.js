// jwtMiddleware.js
const jwt = require('jsonwebtoken');
const secretkey='12345@core360'
// List of routes that should bypass JWT verification
const excludedRoutes = ['/trackClick','/login', '/forgot-password','/forgot', '/signup' , '/update-registration' , '/getUser' , '/verifyOtp' , '/updatePassword' ,'/trackClick'];

const jwtMiddleware = (req, res, next) => {

  // Check if the route is in the excluded list
  console.warn(excludedRoutes.includes('/trackClick'));
  console.warn(req.path)
  console.warn(excludedRoutes.includes(req.path))
  if (excludedRoutes.includes(req.path)) {
    return next(); // Skip JWT verification and go to the next middleware or route handler
  }else if(req.path.startsWith('/trackClick') || req.path.startsWith('/trackConversion')){
    return next();
  }

  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from Authorization header
  console.warn(token)
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    console.warn('Token:', token);
    console.warn('Secret Key:', secretkey);
  
    const decoded = jwt.verify(token, secretkey);
    req.user = decoded; // Attach decoded payload to request object
    next(); // Proceed to the next middleware or route
  } catch (error) {
    console.error('JWT Verification Error:', error.message); // Log exact error message
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = jwtMiddleware;
