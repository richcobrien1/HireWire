import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    userType: 'candidate' | 'company';
    companyId?: number;
  };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    (req as AuthRequest).user = {
      userId: decoded.userId,
      userType: decoded.userType,
      companyId: decoded.companyId
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireCandidate = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (authReq.user.userType !== 'candidate') {
    return res.status(403).json({ error: 'Candidates only' });
  }
  
  next();
};

export const requireCompany = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (authReq.user.userType !== 'company') {
    return res.status(403).json({ error: 'Companies only' });
  }
  
  next();
};
