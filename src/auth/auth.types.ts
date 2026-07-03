export type UserRole = 'provider' | 'admin';

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

export type AuthenticatedUser = JwtPayload;
