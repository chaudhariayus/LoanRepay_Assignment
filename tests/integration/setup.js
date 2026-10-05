// Integration tests only ever talk to TEST_DATABASE_URL, never to the app's
// DATABASE_URL. This runs before any test file imports Prisma.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
