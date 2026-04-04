const fs = require('fs');
let content = fs.readFileSync('apps/api-gateway/src/routes/org-analytics.ts', 'utf8');
content = content.replace("const workerRelPath = isDev\\n      ? 'src/workers/token-aggregation.worker.ts'\\n      : 'dist/workers/token-aggregation.worker.js';",
"const workerRelPath = isDev ? 'apps/api-gateway/src/workers/token-aggregation.worker.ts' : 'apps/api-gateway/dist/workers/token-aggregation.worker.js';");
content = content.replace("const workerRelPath = isDev\\n          ? 'src/workers/analytics.worker.ts'\\n          : 'dist/workers/analytics.worker.js';",
"const workerRelPath = isDev ? 'apps/api-gateway/src/workers/analytics.worker.ts' : 'apps/api-gateway/dist/workers/analytics.worker.js';");
fs.writeFileSync('apps/api-gateway/src/routes/org-analytics.ts', content);
