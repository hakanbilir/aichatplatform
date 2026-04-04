const fs = require('fs');
const content = fs.readFileSync('apps/api-gateway/src/routes/org-analytics.test.ts', 'utf8');
const modified = content.replace('expect(body).not.toBeNull();', 'console.log("PAYLOAD LINES:", lines);\n    expect(body).not.toBeNull();');
fs.writeFileSync('apps/api-gateway/src/routes/org-analytics.test.ts', modified);
