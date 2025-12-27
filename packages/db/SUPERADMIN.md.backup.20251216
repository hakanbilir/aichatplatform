# Superadmin Login Guide

## Overview

Superadmin users have full system access and bypass all organization-level permission checks. They can access any organization, manage all resources, and perform administrative operations across the entire system.

## Default Credentials (Development Only)

When you run the database seed script, a default superadmin user is created with the following credentials:

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Name**: `Admin User`

⚠️ **SECURITY WARNING**: These are default development credentials. **You MUST change the password in production environments!**

## Customizing Seed Credentials

You can customize the superadmin credentials during seeding by setting environment variables:

```bash
export SUPERADMIN_EMAIL="admin@yourdomain.com"
export SUPERADMIN_PASSWORD="your-secure-password"
export SUPERADMIN_NAME="Your Name"
```

Then run the seed script:

```bash
cd packages/db
npm run seed
```

Or using pnpm from the root:

```bash
pnpm --filter @ai-chat/db seed
```

## Creating Additional Superadmin Users

### Using the CLI Tool

The easiest way to create a new superadmin user is using the interactive CLI tool:

```bash
cd packages/db
npm run create-superadmin
```

Or using pnpm from the root:

```bash
pnpm --filter @ai-chat/db create-superadmin
```

The CLI tool will:
1. Prompt for email address (validates format and uniqueness)
2. Prompt for name (optional, defaults to "Superadmin User")
3. Prompt for password (minimum 8 characters, with confirmation)
4. Optionally add the user to an existing organization

**Features:**
- Validates email format
- Checks for existing users (offers to upgrade existing users to superadmin)
- Validates password strength
- Masks password input for security
- Optionally adds user to organizations with specified roles

### Upgrading Existing Users

If you run the CLI tool with an email that already exists:
- If the user is already a superadmin, it will inform you
- If the user is not a superadmin, it will offer to upgrade them

### Programmatic Creation

You can also create superadmin users programmatically using Prisma:

```typescript
import { prisma } from '@ai-chat/db';
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash('secure-password', 10);

const superadmin = await prisma.user.create({
  data: {
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash,
    isSuperadmin: true,
  },
});
```

## Superadmin Permissions

Superadmin users have the following capabilities:

1. **Bypass All Permission Checks**: The `userHasOrgPermission` function in `apps/api-gateway/src/rbac/guards.ts` returns `true` for all permissions when `user.isSuperadmin` is `true`.

2. **Access Any Organization**: Superadmins can access and manage resources across all organizations, regardless of membership.

3. **Full System Access**: Superadmins can:
   - View and manage all organizations
   - Access all conversations and messages
   - Manage all users and memberships
   - Configure system-wide settings
   - View audit logs across all organizations
   - Manage integrations and API keys
   - Access analytics and metrics

## Security Best Practices

### 1. Limit Superadmin Accounts

- Only create superadmin accounts for trusted administrators
- Keep the number of superadmin accounts to a minimum
- Regularly audit superadmin accounts

### 2. Strong Passwords

- Use strong, unique passwords (minimum 16 characters recommended)
- Consider using a password manager
- Enable two-factor authentication if available

### 3. Environment Variables

- Never commit superadmin credentials to version control
- Use environment variables for production credentials
- Rotate passwords regularly

### 4. Audit Logging

All superadmin actions are logged in the audit system. Regularly review:
- Login attempts
- Permission changes
- Organization modifications
- User management actions

### 5. Production Deployment

Before deploying to production:

1. **Change Default Password**: The default `admin123` password must be changed
2. **Use Environment Variables**: Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in your production environment
3. **Remove Default User**: Consider removing the default superadmin and creating a new one with secure credentials
4. **Enable Monitoring**: Set up alerts for superadmin login attempts and actions

## Login Process

Superadmin users log in through the standard authentication endpoint:

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

The response includes the `isSuperadmin` flag:

```json
{
  "token": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "name": "Admin User",
    "isSuperadmin": true
  },
  "activeOrg": {
    "id": "org-id",
    "name": "Organization Name",
    "slug": "org-slug"
  }
}
```

## Troubleshooting

### Cannot Login as Superadmin

1. **Verify User Exists**: Check the database to confirm the user exists and `isSuperadmin` is `true`:
   ```sql
   SELECT id, email, "isSuperadmin" FROM "User" WHERE email = 'admin@example.com';
   ```

2. **Check Password**: Verify the password hash is correct. You can reset it using the CLI tool or by updating directly in the database.

3. **Verify JWT Secret**: Ensure `JWT_SECRET` is properly configured in your environment.

### User Not Recognized as Superadmin

1. **Check Database**: Verify `isSuperadmin` flag is set to `true`:
   ```sql
   UPDATE "User" SET "isSuperadmin" = true WHERE email = 'admin@example.com';
   ```

2. **Regenerate Token**: Log out and log back in to get a new JWT token with the updated superadmin status.

### CLI Tool Not Working

1. **Check Dependencies**: Ensure all dependencies are installed:
   ```bash
   cd packages/db
   npm install
   ```

2. **Check Database Connection**: Verify `DATABASE_URL` is set correctly in your environment.

3. **Check TypeScript**: Ensure TypeScript is properly configured and `ts-node` is available.

## Related Files

- **Database Schema**: `packages/db/prisma/schema.prisma` - User model with `isSuperadmin` field
- **RBAC Guards**: `apps/api-gateway/src/rbac/guards.ts` - Permission checking logic
- **Auth Routes**: `apps/api-gateway/src/routes/auth.ts` - Login endpoint
- **Seed Script**: `packages/db/src/seed.ts` - Initial superadmin creation
- **CLI Tool**: `packages/db/src/cli/createSuperadmin.ts` - Interactive superadmin creation

## Support

For issues or questions regarding superadmin access, please contact your system administrator or refer to the main project documentation.

