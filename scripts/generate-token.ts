import { JwtService } from '@nestjs/jwt';
import { config } from 'dotenv';

import { JwtPayload, UserRole } from '../src/auth/auth.types';

config({ quiet: true });

type TokenName = 'provider' | 'other-provider' | 'admin';

const tokenName = process.argv[2] as TokenName | undefined;
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

const users = {
  provider: {
    sub: '499c1465-884f-4438-ab54-11e565a90c48',
    role: 'provider',
  },
  'other-provider': {
    sub: 'e1cf3eb2-3702-4296-9436-aea369a1feca',
    role: 'provider',
  },
  admin: {
    sub: '9cddf29f-9b5e-47ed-9bd6-8c334075067f',
    role: 'admin',
  },
} satisfies Record<TokenName, JwtPayload & { role: UserRole }>;

if (!tokenName || !Object.hasOwn(users, tokenName)) {
  process.stderr.write(
    'Usage: pnpm auth:token provider|other-provider|admin\n',
  );
  process.exit(1);
}

const jwtService = new JwtService({ secret: jwtSecret });

process.stdout.write(`${jwtService.sign(users[tokenName])}\n`);
