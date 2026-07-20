export const USER_ROLES = ['provider', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole);

export type JwtPayload = {
  sub: string;
  role: string;
};

export type AuthenticatedUser = {
  sub: string;
  role: UserRole;
};
