# Skill Wallet Service

Immutable skill wallet system where skills are created only from approved projects with teacher endorsement.

## NON-NEGOTIABLE RULES

1. ✅ **Skills created only after APPROVED projects**
   - Project status must be `approved` or `completed`
   - Submission must be `graded` with a grade

2. ✅ **Teacher endorsement required**
   - Only users with `Teacher` role can create/update skills
   - Endorsement is permanently recorded

3. ✅ **Skills cannot be edited or deleted**
   - Student skills in wallet are immutable
   - Only maturity (level/progress) can be updated

4. ✅ **Maturity only progresses forward**
   - Level can only increase (by 1 at a time)
   - Progress can only increase
   - Cannot decrease level or progress

5. ✅ **No manual inserts**
   - All skills must come from approved projects
   - Guard prevents direct database manipulation

## API Endpoints

### POST `/api/v1/skill-wallet/create-from-project`

Create a skill in student wallet from an approved project submission.

**Required Role**: `Teacher`  
**Required Permission**: `skill-wallet:create`

**Request:**
```json
{
  "studentId": "student-uuid",
  "skillId": "skill-uuid",
  "submissionId": "submission-uuid",
  "initialLevel": 1,
  "initialProgress": 25.5
}
```

**Validation:**
- Submission must exist and belong to student
- Submission must be `graded` with a grade
- Project must be `approved` or `completed`
- Project must be active
- Skill must exist and be active
- Student must not already have this skill
- Teacher must have `Teacher` role

**Response:**
```json
{
  "id": "student-skill-uuid",
  "studentId": "student-uuid",
  "skillId": "skill-uuid",
  "level": 1,
  "progress": 25.5,
  "projectId": "project-uuid",
  "submissionId": "submission-uuid",
  "endorsedBy": "teacher-uuid",
  "endorsementDate": "2024-01-15T10:30:00Z",
  "skill": {
    "id": "skill-uuid",
    "name": "JavaScript",
    "category": "Programming",
    "description": "JavaScript programming"
  },
  "project": {
    "id": "project-uuid",
    "name": "Web Development Project"
  },
  "endorser": {
    "id": "teacher-uuid",
    "email": "teacher@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}
```

### PATCH `/api/v1/skill-wallet/:studentSkillId/maturity`

Update skill maturity (level/progress). Can only increase.

**Required Role**: `Teacher`  
**Required Permission**: `skill-wallet:update`

**Request:**
```json
{
  "level": 2,
  "progress": 50.0
}
```

**Validation:**
- Level can only increase (by 1 at a time)
- Progress can only increase
- Progress cannot exceed 100%
- Cannot decrease level or progress

**Response:**
```json
{
  "id": "student-skill-uuid",
  "level": 2,
  "progress": 50.0,
  "lastUpdated": "2024-01-20T14:00:00Z",
  ...
}
```

### GET `/api/v1/skill-wallet/student/:studentId`

Get student's skill wallet (read-only).

**Required Roles**: `Student`, `Teacher`, `SchoolAdmin`, `PlatformAdmin`  
**Required Permission**: `skill-wallet:read`

**Response:**
```json
{
  "studentId": "student-uuid",
  "totalSkills": 5,
  "skills": [
    {
      "id": "student-skill-uuid",
      "skill": {
        "id": "skill-uuid",
        "name": "JavaScript",
        "category": "Programming",
        "description": "JavaScript programming"
      },
      "level": 2,
      "progress": 75.5,
      "project": {
        "id": "project-uuid",
        "name": "Web Development Project",
        "status": "approved"
      },
      "submission": {
        "id": "submission-uuid",
        "status": "graded",
        "grade": 95.0,
        "submittedAt": "2024-01-10T10:00:00Z"
      },
      "endorsedBy": {
        "id": "teacher-uuid",
        "email": "teacher@example.com",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "endorsementDate": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-20T14:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET `/api/v1/skill-wallet/my-wallet`

Get authenticated student's own skill wallet.

**Required Role**: `Student`  
**Required Permission**: `skill-wallet:read`

**Response**: Same as above

### GET `/api/v1/skill-wallet/validate/:submissionId`

Validate if a submission is eligible for skill creation.

**Required Role**: `Teacher`  
**Required Permission**: `skill-wallet:read`

**Response:**
```json
{
  "valid": true
}
```

or

```json
{
  "valid": false,
  "reason": "Submission must be graded before skills can be created"
}
```

## Transaction Safety

All skill creation and updates use Prisma transactions:

```typescript
await this.prisma.executeTransaction(async (tx) => {
  // All operations in transaction
  // Rollback on any error
});
```

This ensures:
- Atomic operations
- Data consistency
- No partial updates
- Automatic rollback on failure

## Validation Guards

### Project Approval Guard
- Checks project status is `approved` or `completed`
- Verifies project is active
- Validates submission is graded

### Teacher Endorsement Guard
- Verifies user has `Teacher` role
- Checks teacher account is active
- Records endorsement permanently

### Maturity Progression Guard
- Prevents level decrease
- Prevents progress decrease
- Limits level increase to +1
- Validates progress <= 100%

### Immutability Guard
- Skills cannot be deleted
- Skills cannot be edited (except maturity)
- All changes are audit logged

## Audit Logging

All skill wallet operations are logged:

- `skill_wallet_created`: When skill is added to wallet
- `skill_maturity_updated`: When level/progress is updated

Each log includes:
- User ID (teacher who performed action)
- Entity: `StudentSkill`
- Entity ID
- Changes: Full details of what changed

## Database Schema

### StudentSkill Model
```prisma
model StudentSkill {
  id                String    @id @default(uuid())
  studentId         String
  skillId           String
  level             Int       @default(1)
  progress          Decimal   @default(0)
  projectId         String    // Required: Links to approved project
  submissionId      String    // Required: Links to graded submission
  endorsedBy        String    // Required: Teacher who endorsed
  endorsementDate   DateTime  @default(now())
  lastUpdated       DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  student           User
  skill             Skill
  project           Project
  submission        ProjectSubmission
  endorser          User      @relation("SkillEndorser")
}
```

## Usage Example

```typescript
// 1. Teacher creates skill from approved project
POST /api/v1/skill-wallet/create-from-project
{
  "studentId": "student-uuid",
  "skillId": "javascript-skill-uuid",
  "submissionId": "graded-submission-uuid",
  "initialLevel": 1,
  "initialProgress": 25.0
}

// 2. Teacher updates maturity (can only increase)
PATCH /api/v1/skill-wallet/{studentSkillId}/maturity
{
  "level": 2,
  "progress": 50.0
}

// 3. Student views their wallet
GET /api/v1/skill-wallet/my-wallet
```

## Error Handling

- `400 Bad Request`: Invalid data, project not approved, maturity decrease attempt
- `403 Forbidden`: Not a teacher, unauthorized access
- `404 Not Found`: Submission, skill, or student not found
- `409 Conflict`: Student already has this skill

## Security Features

1. **Role Enforcement**: Only teachers can create/update
2. **Project Validation**: Only approved projects allowed
3. **Submission Validation**: Only graded submissions allowed
4. **Immutability**: Skills cannot be deleted or edited
5. **Progression Only**: Maturity can only increase
6. **Audit Trail**: All actions logged permanently

