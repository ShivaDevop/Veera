# Prisma Database Module

This module provides a production-ready Prisma integration for Azure SQL with advanced features.

## Features

- **Singleton PrismaClient**: Ensures a single database connection instance
- **Automatic Soft Deletes**: Middleware automatically filters deleted records
- **Transaction Support**: Built-in transaction methods with retry logic
- **Proper Shutdown Hooks**: Graceful database disconnection on application shutdown
- **Strict Relation Handling**: Helper functions for safe relation access
- **Query Logging**: Development-mode query logging

## Usage

### Basic Usage

```typescript
import { PrismaService } from './database/prisma.service';

@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
    // Automatically filters deletedAt: null
  }
}
```

### Transactions

#### Simple Transaction

```typescript
async createUserWithRole(userData: CreateUserDto, roleId: string) {
  return this.prisma.executeTransaction(async (tx) => {
    const user = await tx.user.create({
      data: userData,
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId,
      },
    });

    return user;
  });
}
```

#### Transaction with Retry (for Azure SQL)

```typescript
async createUserWithRoleWithRetry(userData: CreateUserDto, roleId: string) {
  return this.prisma.executeTransactionWithRetry(
    async (tx) => {
      const user = await tx.user.create({
        data: userData,
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId,
        },
      });

      return user;
    },
    3, // max retries
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 5000,
    },
  );
}
```

### Soft Deletes

Soft deletes are handled automatically by middleware:

```typescript
// This will automatically set deletedAt instead of actually deleting
await this.prisma.user.delete({
  where: { id: userId },
});

// To include deleted records, explicitly set deletedAt
await this.prisma.user.findMany({
  where: { deletedAt: { not: null } },
});
```

### Strict Relation Handling

```typescript
import { ensureRelationExists } from './database/prisma.helpers';

async getUserWithSchool(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { parent: true },
  });

  // Throws error if parent doesn't exist
  const parent = ensureRelationExists(user.parent, 'Parent', userId);
  return parent;
}
```

### Health Check

```typescript
async checkDatabaseHealth() {
  const isHealthy = await this.prisma.healthCheck();
  return { database: isHealthy ? 'connected' : 'disconnected' };
}
```

## Configuration

Configure the database connection in `.env`:

```env
DATABASE_URL="sqlserver://your-server.database.windows.net:1433;database=your-database;user=your-user;password=your-password;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30;"
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Middleware Behavior

The soft delete middleware automatically:

- Converts `delete` operations to `update` with `deletedAt`
- Converts `deleteMany` operations to `updateMany` with `deletedAt`
- Filters `findUnique`, `findFirst`, `findMany` to exclude deleted records
- Filters `update`, `updateMany`, `count` to exclude deleted records

To query deleted records, explicitly include them in your where clause:

```typescript
// Get deleted users
const deletedUsers = await this.prisma.user.findMany({
  where: { deletedAt: { not: null } },
});
```

