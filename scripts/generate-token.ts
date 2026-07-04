import { JwtService } from '@nestjs/jwt';
import { config } from 'dotenv';

import { JwtPayload, UserRole } from '../src/auth/auth.types';

config({ quiet: true });

const role = process.argv[2] as UserRole | undefined;
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

const users: Record<UserRole, JwtPayload> = {
  provider: {
    sub: '499c1465-884f-4438-ab54-11e565a90c48',
    role: 'provider',
  },
  admin: {
    sub: '9cddf29f-9b5e-47ed-9bd6-8c334075067f',
    role: 'admin',
  },
};

if (!role || !users[role]) {
  process.stderr.write('Usage: pnpm auth:token provider|admin\n');
  process.exit(1);
}

const jwtService = new JwtService({ secret: jwtSecret });

process.stdout.write(`${jwtService.sign(users[role])}\n`);
