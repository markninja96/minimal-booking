export const USER_ROLES = ['provider', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  USER_ROLES.includes(value as UserRole);

export type JwtPayload = {
  sub: string;
  role: string;
};

export type AuthenticatedUser = {
  sub: string;
  role: UserRole;
};
