const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'apps/api-gateway/src/routes/chat.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const searchRegex =
  / {6}\} else if \(conversation\.userId !== payload\.userId\) \{\s+\/\/ Should not happen due to OR conditions in query, but defensive coding\s+return reply\.code\(403\)\.send\(\{ error: request\.i18n\.t\('errors\.forbidden'\) \}\);\s+\}/g;

const replacement = `      } else if (conversation.userId !== payload.userId) {
        // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }`;

content = content.replace(searchRegex, replacement);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Patched successfully!');
