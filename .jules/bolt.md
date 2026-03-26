## 2024-05-18 - [Parallelize DB queries in getOrgAnalytics]
**Learning:** In Fastify route handlers or services performing multiple independent database queries (like `prisma.message.findMany` or `prisma.message.groupBy`), running them sequentially is an anti-pattern that unnecessarily adds up latency.
**Action:** Always identify independent database operations and group them into a single `Promise.all` block. Unpack the results together. This significantly reduces latency.

## 2025-03-26 - Single Query Optimization for Conversations Endpoint
**Learning:** In Prisma, querying an array of IDs first and using them in an `in` filter (creating two database round trips) is an anti-pattern when it can be expressed as a single relation filter. For example, instead of querying `orgMember` and then filtering `conversation` by `orgId: { in: orgIds }`, it is much faster and reduces latency to use `{ org: { members: { some: { userId } } } }`.
**Action:** When implementing authorization checks or resource lookups that depend on relational membership, write a single Prisma query with `some` or `every` relation filters instead of sequentially fetching parent resource IDs.
