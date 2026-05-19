declare global {
  namespace Express {
    interface Request {
      user?: import('../../modules/auth/types/auth.types').SessionUser;
    }
  }
}

export {};
