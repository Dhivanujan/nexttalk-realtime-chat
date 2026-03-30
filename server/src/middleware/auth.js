
import jwt from "jsonwebtoken";


export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

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



