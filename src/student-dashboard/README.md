# Student Dashboard API

Comprehensive dashboard API for students to view their learning progress, assignments, and achievements.

## Features

- ✅ Skill snapshot (derived/read-only)
- ✅ Active project assignments
- ✅ Submitted projects
- ✅ Badges (derived)
- ✅ Notifications
- ✅ Optimized Prisma queries with parallel execution
- ✅ Student can only access own data

## API Endpoints

### GET `/api/v1/student-dashboard/my-dashboard`

Get the authenticated student's dashboard data.

**Required Role**: `Student`  
**Required Permission**: `dashboard:read`

**Request Headers:**
```
Authorization: Bearer <access_token>
X-Active-Role: Student
```

**Response:**
```json
{
  "skillSnapshot": {
    "totalSkills": 15,
    "averageLevel": 3.5,
    "averageProgress": 75.5,
    "categoriesCount": 4,
    "skillsByCategory": {
      "Programming": [
        {
          "skillId": "skill-uuid",
          "skillName": "JavaScript",
          "description": "JavaScript programming",
          "level": 4,
          "progress": 85.5,
          "lastUpdated": "2024-01-15T10:30:00Z"
        }
      ],
      "Mathematics": [...]
    },
    "recentSkills": [
      {
        "skillId": "skill-uuid",
        "skillName": "JavaScript",
        "category": "Programming",
        "level": 4,
        "progress": 85.5,
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "activeProjectAssignments": [
    {
      "assignmentId": "assignment-uuid",
      "projectId": "project-uuid",
      "projectName": "Science Fair Project",
      "description": "Annual science fair project",
      "status": "in_progress",
      "assignedAt": "2024-01-10T09:00:00Z",
      "dueDate": "2024-02-15T23:59:59Z",
      "isOverdue": false,
      "daysUntilDue": 25,
      "notes": "Complete by end of month",
      "hasSubmission": false
    }
  ],
  "submittedProjects": [
    {
      "submissionId": "submission-uuid",
      "projectId": "project-uuid",
      "projectName": "Math Project",
      "description": "Algebra project",
      "status": "graded",
      "submittedAt": "2024-01-05T14:30:00Z",
      "grade": 95.5,
      "feedback": "Excellent work!",
      "hasGrade": true
    }
  ],
  "badges": {
    "totalBadges": 8,
    "categoriesCount": 3,
    "badgesByCategory": {
      "Achievement": [
        {
          "badgeId": "badge-uuid",
          "name": "First Project",
          "description": "Completed your first project",
          "category": "Achievement",
          "icon": "trophy",
          "earnedAt": "2024-01-01T10:00:00Z",
          "metadata": {}
        }
      ]
    },
    "recentBadges": [
      {
        "badgeId": "badge-uuid",
        "name": "First Project",
        "description": "Completed your first project",
        "category": "Achievement",
        "icon": "trophy",
        "earnedAt": "2024-01-01T10:00:00Z"
      }
    ]
  },
  "notifications": {
    "total": 10,
    "unreadCount": 3,
    "notifications": [
      {
        "id": "notification-uuid",
        "title": "New Assignment",
        "message": "You have a new project assignment",
        "type": "info",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

### GET `/api/v1/student-dashboard/:studentId`

Get dashboard data for a specific student (students can only access their own data).

**Required Role**: `Student`  
**Required Permission**: `dashboard:read`

**Response**: Same as `/my-dashboard`

**Security**: Returns `403 Forbidden` if studentId doesn't match authenticated user ID.

## Data Models

### Skill Snapshot

Derived from `StudentSkill` table (read-only):
- Total skills count
- Average level across all skills
- Average progress percentage
- Skills grouped by category
- Recent skills (top 5 by last updated)

### Active Project Assignments

From `ProjectAssignment` table:
- Only assignments with status `assigned` or `in_progress`
- Includes project details
- Calculates overdue status
- Shows days until due
- Indicates if submission exists

### Submitted Projects

From `ProjectSubmission` table:
- Last 20 submissions
- Status: `submitted`, `graded`, or `returned`
- Includes grades and feedback
- Ordered by submission date (newest first)

### Badges

From `Badge` table (derived):
- Total badges earned
- Badges grouped by category
- Recent badges (top 5 by earned date)
- Includes metadata

### Notifications

From `Notification` table:
- Last 10 notifications
- Unread count
- Ordered by creation date (newest first)

## Query Optimization

The service uses **parallel queries** with `Promise.all()` to fetch all dashboard data simultaneously:

```typescript
const [
  skillSnapshot,
  activeAssignments,
  submittedProjects,
  badges,
  notifications,
] = await Promise.all([
  this.getSkillSnapshot(studentId),
  this.getActiveProjectAssignments(studentId),
  this.getSubmittedProjects(studentId),
  this.getBadges(studentId),
  this.getNotifications(studentId),
]);
```

This reduces total query time from sequential (sum of all queries) to parallel (max of all queries).

## Security

### Access Control

1. **Role-based**: Only `Student` role can access
2. **Permission-based**: Requires `dashboard:read` permission
3. **Data isolation**: Students can only access their own data
4. **Validation**: Service checks `studentId === requestingUserId`

### Error Responses

- `403 Forbidden`: Student trying to access another student's data
- `401 Unauthorized`: Missing or invalid authentication
- `400 Bad Request`: Missing required role header

## Database Schema

### ProjectAssignment
```prisma
model ProjectAssignment {
  id          String    @id @default(uuid())
  projectId   String
  studentId   String
  assignedBy  String?
  assignedAt  DateTime  @default(now())
  dueDate     DateTime?
  status      String    @default("assigned")
  notes       String?
  ...
}
```

### ProjectSubmission
```prisma
model ProjectSubmission {
  id            String    @id @default(uuid())
  projectId     String
  studentId     String
  assignmentId  String?
  submittedAt   DateTime  @default(now())
  status        String    @default("submitted")
  grade         Decimal?
  feedback      String?
  ...
}
```

### StudentSkill
```prisma
model StudentSkill {
  id          String    @id @default(uuid())
  studentId   String
  skillId     String
  level       Int       @default(1)
  progress    Decimal   @default(0)
  lastUpdated DateTime  @default(now())
  ...
}
```

### Badge
```prisma
model Badge {
  id          String    @id @default(uuid())
  studentId   String
  name        String
  description String?
  category    String?
  icon        String?
  earnedAt    DateTime  @default(now())
  metadata    Json?
  ...
}
```

## Usage Example

```typescript
// Frontend call
const response = await fetch('/api/v1/student-dashboard/my-dashboard', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Active-Role': 'Student',
  },
});

const dashboard = await response.json();

// Display skills
console.log(`Total Skills: ${dashboard.skillSnapshot.totalSkills}`);
console.log(`Average Level: ${dashboard.skillSnapshot.averageLevel}`);

// Display active assignments
dashboard.activeProjectAssignments.forEach(assignment => {
  console.log(`${assignment.projectName} - Due in ${assignment.daysUntilDue} days`);
});

// Display notifications
console.log(`Unread: ${dashboard.notifications.unreadCount}`);
```

## Performance Considerations

1. **Parallel Queries**: All data fetched simultaneously
2. **Selective Fields**: Only necessary fields selected
3. **Limited Results**: Notifications limited to 10, submissions to 20
4. **Indexed Queries**: Uses indexed fields (studentId, status, dates)
5. **Efficient Grouping**: In-memory grouping for categories

## Next Steps

1. Run Prisma migration:
   ```bash
   npm run prisma:migrate
   ```

2. Seed initial data:
   - Create project assignments
   - Create student skills
   - Create badges
   - Create notifications

3. Test the endpoint with a student user

