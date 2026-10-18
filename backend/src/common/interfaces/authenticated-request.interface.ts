import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  organizationId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  requestId?: string;
}
