
import jwt from "jsonwebtoken";


export function requireAuth(req, res, next) {
  // Read token from secure HTTP-only cookies first, fallback to bearer for backwards compati
  const token = req.cookies.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "");
    req.userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}



