import './setup-env';

process.env.TEST_DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5433/bookings_test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
