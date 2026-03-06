const fs = require('fs');

const knowledgePath = 'apps/web/src/knowledge/KnowledgeBasePage.tsx';
let code = fs.readFileSync(knowledgePath, 'utf8');

code = code.replace(
  '                              {/* Placeholder for future actions (e.g. open full doc, pin, etc.) */}',
  '',
);

fs.writeFileSync(knowledgePath, code);
