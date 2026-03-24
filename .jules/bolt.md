## 2024-05-18 - [Parallelize DB queries in getOrgAnalytics]
**Learning:** In Fastify route handlers or services performing multiple independent database queries (like `prisma.message.findMany` or `prisma.message.groupBy`), running them sequentially is an anti-pattern that unnecessarily adds up latency.
**Action:** Always identify independent database operations and group them into a single `Promise.all` block. Unpack the results together. This significantly reduces latency.
