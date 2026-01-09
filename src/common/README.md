# RBAC (Role-Based Access Control) System

Comprehensive role-based access control system with active role context per request.

## Features

- ✅ Multiple roles per user
- ✅ Active role must be set per request
- ✅ Role-based endpoint protection
- ✅ Permission-based access control (via RBAC guard)
- ✅ Role context middleware
- ✅ Type-safe role definitions

## Roles

The system supports the following roles:

- **Student**: Basic student access
- **Teacher**: Teacher-level access
- **Parent**: Parent access
- **SchoolAdmin**: School administration access
- **PlatformAdmin**: Platform-wide administration access

## Usage

### 1. Setting Active Role

Every authenticated request must include the `X-Active-Role` header:

```http
GET /api/v1/users
Authorization: Bearer <access_token>
X-Active-Role: Teacher
```

### 2. Using @Roles Decorator

Protect endpoints with required roles:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('classes')
export class ClassesController {
  @Get()
  @Roles('Teacher', 'SchoolAdmin')
  async findAll() {
    // Only accessible with Teacher or SchoolAdmin active role
  }
}
```

### 3. Combining with Permissions

Use both role and permission checks:

```typescript
import { Controller, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  @Post()
  @Roles('PlatformAdmin', 'SchoolAdmin')
  @RequirePermissions('users:create')
  async create() {
    // Requires active role AND permission
  }
}
```

### 4. Getting User Roles

Get all roles assigned to a user:

```typescript
GET /api/v1/auth/roles
Authorization: Bearer <access_token>
```

Response:
```json
{
  "roles": ["Student", "Teacher"],
  "activeRole": "Teacher"
}
```

### 5. Setting Active Role (Endpoint)

Set active role for documentation/reference:

```typescript
POST /api/v1/auth/set-active-role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "Teacher"
}
```

**Note**: This endpoint is informational. The actual active role is determined by the `X-Active-Role` header in each request.

## Guards

### RolesGuard

Checks if the active role (from `X-Active-Role` header) matches the required roles for the endpoint.

**Order**: Applied after JwtAuthGuard, before RbacGuard

### RbacGuard

Checks if the active role has the required permissions. Uses permissions from the role's `permissions` JSON field in the database.

**Order**: Applied after RolesGuard

## Middleware

### RoleContextMiddleware

Automatically extracts and validates the `X-Active-Role` header from requests. Sets `req.activeRole` for use in guards.

**Applied to**: All routes (`*`)

## Request Flow

1. **JwtAuthGuard**: Validates JWT token and loads user with roles
2. **RoleContextMiddleware**: Extracts `X-Active-Role` header
3. **RolesGuard**: Validates active role matches required roles
4. **RbacGuard**: Validates active role has required permissions
5. **Controller**: Executes if all guards pass

## Error Responses

### Missing Active Role

```json
{
  "statusCode": 400,
  "message": "Active role must be set. Include X-Active-Role header in your request.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Invalid Role

```json
{
  "statusCode": 400,
  "message": "Invalid role: InvalidRole. Valid roles are: Student, Teacher, Parent, SchoolAdmin, PlatformAdmin",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### User Doesn't Have Role

```json
{
  "statusCode": 403,
  "message": "User does not have the active role: Teacher",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Role Not Authorized

```json
{
  "statusCode": 403,
  "message": "Active role 'Student' is not authorized for this endpoint. Required roles: Teacher, SchoolAdmin",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Example: Complete Controller

```typescript
import { Controller, Get, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('classes')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-Active-Role', description: 'Active role for this request' })
@Controller('classes')
export class ClassesController {
  @Get()
  @Roles('Student', 'Teacher', 'SchoolAdmin')
  async findAll() {
    // Accessible to multiple roles
  }

  @Post()
  @Roles('Teacher', 'SchoolAdmin')
  @RequirePermissions('classes:create')
  async create() {
    // Requires role AND permission
  }

  @Delete(':id')
  @Roles('SchoolAdmin')
  @RequirePermissions('classes:delete')
  async delete() {
    // Highest level access
  }
}
```

## Best Practices

1. **Always set X-Active-Role header**: Required for all authenticated requests
2. **Use specific roles**: Don't use `PlatformAdmin` for everything
3. **Combine with permissions**: Use both role and permission checks for fine-grained control
4. **Validate on client**: Check user roles before making requests
5. **Document in Swagger**: Use `@ApiHeader` to document the required header

## Type Safety

All roles are type-safe:

```typescript
import { Role } from '../common/decorators/roles.decorator';

const role: Role = 'Teacher'; // ✅ Valid
const invalidRole: Role = 'InvalidRole'; // ❌ TypeScript error
```

