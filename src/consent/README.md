# Parent-Student Consent Management

Comprehensive consent management system for students under 13 years of age, ensuring compliance with child protection regulations.

## Features

- ✅ Age-based consent requirement (students under 13)
- ✅ Parent invitation system with secure tokens
- ✅ Explicit parent approval required
- ✅ Consent timestamp tracking
- ✅ Complete audit logging of consent changes
- ✅ Automatic account activation/deactivation based on consent
- ✅ Consent status visibility

## Business Rules

### Age Requirement
- Students **under 13 years old** require parent consent
- Students **13 and older** do not require consent
- Age is calculated from `dateOfBirth` field

### Account Activation
- Students under 13 **cannot activate** without parent consent
- Account is automatically activated when consent is approved
- Account is automatically deactivated when consent is revoked

### Consent Lifecycle
1. **Invitation**: Admin invites parent via email
2. **Pending**: Parent receives invitation token
3. **Approved**: Parent explicitly approves consent
4. **Revoked**: Parent can revoke consent (deactivates account)

## API Endpoints

### POST `/api/v1/consent/student/:studentId/invite-parent`

Invite a parent to provide consent for a student.

**Required Role**: `SchoolAdmin` or `PlatformAdmin`  
**Required Permission**: `consent:create`

**Request:**
```json
{
  "parentEmail": "parent@example.com",
  "notes": "Please provide consent for your child to use the platform"
}
```

**Response:**
```json
{
  "consentId": "consent-uuid",
  "invitationToken": "a1b2c3d4e5f6...",
  "expiresAt": "2024-02-01T00:00:00Z",
  "message": "Parent invitation sent successfully"
}
```

**Validation:**
- Student must exist
- Student must have `dateOfBirth` set
- Student must be under 13 years old
- Parent email must exist and be registered as a parent
- Cannot invite if consent already approved

### POST `/api/v1/consent/accept`

Accept parent consent invitation.

**Required Role**: `Parent`

**Request:**
```json
{
  "invitationToken": "a1b2c3d4e5f6...",
  "notes": "I approve my child to use the platform"
}
```

**Response:**
```json
{
  "consentId": "consent-uuid",
  "status": "approved",
  "consentDate": "2024-01-15T10:30:00Z",
  "student": {
    "id": "student-uuid",
    "email": "student@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "2015-01-01T00:00:00Z"
  },
  "message": "Consent approved successfully"
}
```

**Validation:**
- Invitation token must be valid
- Token must not be expired
- Parent must be authorized (token belongs to them)
- Consent must not already be approved
- Consent must not be revoked

**Side Effects:**
- Student account is automatically activated if under 13
- Audit log entry created

### POST `/api/v1/consent/revoke/:consentId`

Revoke parent consent.

**Required Role**: `Parent`

**Response:**
```json
{
  "consentId": "consent-uuid",
  "status": "revoked",
  "revokedDate": "2024-01-20T14:00:00Z",
  "message": "Consent revoked successfully"
}
```

**Side Effects:**
- Student account is automatically deactivated if under 13
- Audit log entry created

### GET `/api/v1/consent/student/:studentId/status`

Get consent status for a student.

**Required Roles**: `Student`, `Teacher`, `Parent`, `SchoolAdmin`, `PlatformAdmin`  
**Required Permission**: `consent:read`

**Response:**
```json
{
  "studentId": "student-uuid",
  "studentEmail": "student@example.com",
  "studentName": "Jane Doe",
  "dateOfBirth": "2015-01-01T00:00:00Z",
  "age": 9,
  "requiresConsent": true,
  "canActivate": true,
  "isActive": true,
  "consents": [
    {
      "consentId": "consent-uuid",
      "parentId": "parent-uuid",
      "parentEmail": "parent@example.com",
      "parentName": "John Doe",
      "status": "approved",
      "consentGiven": true,
      "consentDate": "2024-01-15T10:30:00Z",
      "revokedDate": null,
      "invitedAt": "2024-01-10T09:00:00Z",
      "expiresAt": "2024-02-10T09:00:00Z",
      "notes": "Approved for platform use"
    }
  ]
}
```

### GET `/api/v1/consent/parent/my-consents`

Get all consent requests for the authenticated parent.

**Required Role**: `Parent`

**Response:**
```json
[
  {
    "consentId": "consent-uuid",
    "studentId": "student-uuid",
    "studentEmail": "student@example.com",
    "studentName": "Jane Doe",
    "status": "approved",
    "consentGiven": true,
    "consentDate": "2024-01-15T10:30:00Z",
    "revokedDate": null,
    "invitationToken": "a1b2c3d4e5f6...",
    "invitedAt": "2024-01-10T09:00:00Z",
    "expiresAt": "2024-02-10T09:00:00Z",
    "notes": "Approved for platform use"
  }
]
```

## Database Schema

### ParentConsent Model
```prisma
model ParentConsent {
  id            String    @id @default(uuid())
  studentId     String
  parentId      String
  status        String    @default("pending")
  consentGiven  Boolean   @default(false)
  consentDate   DateTime?
  revokedDate   DateTime?
  invitationToken String  @unique
  invitedAt     DateTime  @default(now())
  expiresAt     DateTime
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  student       User      @relation("Student", ...)
  parent        User      @relation("Parent", ...)
}
```

### User Model Updates
- Added `dateOfBirth` field for age calculation
- Relations to `ParentConsent` as both student and parent

## Validation Rules

### Age Calculation
- Age is calculated from `dateOfBirth` to current date
- Accounts for month and day (not just year)
- Students under 13 require consent

### Invitation Validation
- Student must exist and have `dateOfBirth`
- Student must be under 13
- Parent must exist and be registered as a parent
- Cannot invite if consent already approved
- Invitation tokens expire after 30 days

### Consent Acceptance
- Token must be valid and not expired
- Parent must match token owner
- Consent must be in "pending" status
- Cannot accept already approved consent
- Cannot accept revoked consent

### Account Activation
- Students under 13: Activated when consent approved, deactivated when revoked
- Students 13+: No consent required, can activate normally

## Audit Logging

All consent actions are logged in the `audit_logs` table:

- `consent_invited`: When parent is invited
- `consent_approved`: When parent approves consent
- `consent_revoked`: When parent revokes consent

Each log entry includes:
- User ID (who performed the action)
- Entity: `ParentConsent`
- Entity ID: Student ID
- Changes: JSON with action details
- IP address and user agent

## Usage Example

```typescript
// 1. Admin invites parent
POST /api/v1/consent/student/{studentId}/invite-parent
{
  "parentEmail": "parent@example.com",
  "notes": "Please approve consent"
}

// 2. Parent accepts consent
POST /api/v1/consent/accept
{
  "invitationToken": "token-from-invitation",
  "notes": "I approve"
}

// 3. Check consent status
GET /api/v1/consent/student/{studentId}/status

// 4. Parent revokes consent (if needed)
POST /api/v1/consent/revoke/{consentId}
```

## Security Considerations

1. **Invitation Tokens**: Cryptographically secure (64 bytes random)
2. **Token Expiration**: 30-day expiry prevents stale invitations
3. **Authorization**: Parents can only accept/revoke their own consents
4. **Audit Trail**: All actions logged with IP and user agent
5. **Account Protection**: Students under 13 cannot activate without consent

## Error Handling

- `400 Bad Request`: Invalid data, expired token, age requirement not met
- `403 Forbidden`: Not authorized to perform action
- `404 Not Found`: Student, parent, or consent not found
- `409 Conflict`: Consent already approved/revoked

