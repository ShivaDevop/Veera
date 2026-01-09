# Authentication Module

Comprehensive authentication system for VEERA with JWT access tokens, refresh tokens, and audit logging.

## Features

- ✅ Email + password authentication
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT access tokens (default: 15 minutes)
- ✅ Refresh tokens (default: 7 days)
- ✅ Token rotation on refresh
- ✅ Account activation flag (`isActive`)
- ✅ Login audit logging
- ✅ IP address and user agent tracking
- ✅ Logout and logout-all functionality

## API Endpoints

### POST `/api/v1/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true
  }
}
```

### POST `/api/v1/auth/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:** Same as login response with new tokens.

### POST `/api/v1/auth/logout`

Logout and revoke refresh token. Requires authentication.

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### POST `/api/v1/auth/logout-all`

Logout from all devices. Requires authentication.

**Response:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

## Token Rotation

When a refresh token is used, the system:

1. Validates the refresh token
2. Generates new access and refresh tokens
3. Revokes the old refresh token
4. Links the new token to the old one (via `replacedBy`)
5. Logs the refresh action

This ensures that:
- Compromised tokens are invalidated
- Token usage is tracked
- Only one valid refresh token exists per rotation

## Security Features

### Password Hashing
- Uses bcrypt with 10 salt rounds
- Passwords are never stored in plaintext
- Password validation uses constant-time comparison

### Token Security
- Access tokens: Short-lived (15 minutes default)
- Refresh tokens: Long-lived (7 days default), stored in database
- Refresh tokens are cryptographically random (128 bytes)
- Tokens are revoked on logout
- Expired tokens are automatically cleaned up

### Account Activation
- Users must have `isActive: true` to login
- Inactive accounts are rejected at login
- Account status is checked on token validation

### Audit Logging
All authentication events are logged:
- `login_success` / `login_failed`
- `token_refresh_success` / `token_refresh_failed`
- Includes IP address and user agent
- Stored in `audit_logs` table

## Database Schema

### RefreshToken Model
```prisma
model RefreshToken {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  expiresAt    DateTime
  isRevoked    Boolean  @default(false)
  replacedBy   String?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())
  revokedAt    DateTime?
  
  user         User     @relation(...)
}
```

## Configuration

Environment variables:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-characters
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-token-secret-optional-if-same-as-jwt-secret
```

## Token Cleanup

Expired and revoked tokens should be cleaned up periodically. Use the `TokenCleanupService`:

```typescript
import { TokenCleanupService } from './auth/token-cleanup.service';

// Manual cleanup
await tokenCleanupService.cleanupExpiredTokens();

// Or schedule via cron (requires @nestjs/schedule)
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async handleTokenCleanup() {
  await this.tokenCleanupService.cleanupExpiredTokens();
}
```

## Usage Example

```typescript
import { AuthService } from './auth/auth.service';

@Injectable()
export class MyService {
  constructor(private authService: AuthService) {}

  async loginUser(email: string, password: string, ip: string, userAgent: string) {
    const loginDto = { email, password };
    return this.authService.login(loginDto, ip, userAgent);
  }

  async refreshUserToken(refreshToken: string, ip: string, userAgent: string) {
    const refreshDto = { refreshToken };
    return this.authService.refreshToken(refreshDto, ip, userAgent);
  }
}
```

## Error Handling

- `401 Unauthorized`: Invalid credentials, expired token, or inactive account
- `400 Bad Request`: Missing or invalid request data
- All errors are logged in audit logs

## Best Practices

1. **Store refresh tokens securely**: Use httpOnly cookies in production
2. **Rotate tokens regularly**: Use token rotation on every refresh
3. **Monitor audit logs**: Track failed login attempts
4. **Clean up tokens**: Schedule daily cleanup of expired tokens
5. **Use HTTPS**: Always use HTTPS in production
6. **Strong secrets**: Use cryptographically strong JWT secrets (min 32 characters)

