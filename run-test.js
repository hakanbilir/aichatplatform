const { execSync } = require('child_process');
try {
  execSync('DATABASE_URL=mock REDIS_URL=mock JWT_SECRET=mockmockmockmock bun test apps/api-gateway/src/routes/org-analytics.test.ts', { stdio: 'inherit' });
} catch {
  // ok
}
