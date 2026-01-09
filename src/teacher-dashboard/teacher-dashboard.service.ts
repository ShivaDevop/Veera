import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TeacherDashboardService {
  private readonly logger = new Logger(TeacherDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboard(teacherId: string) {
    // Verify user is a teacher
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new ForbiddenException('Teacher not found');
    }

    const isTeacher = teacher.roles.some((ur) => ur.role.name === 'Teacher');
    if (!isTeacher) {
      throw new ForbiddenException('User is not a teacher');
    }

    // Execute all queries in parallel for optimal performance
    const [
      classes,
      studentRoster,
      assignedProjects,
      submissionQueue,
      pendingReviews,
    ] = await Promise.all([
      this.getClasses(teacherId),
      this.getStudentRoster(teacherId),
      this.getAssignedProjects(teacherId),
      this.getSubmissionQueue(teacherId),
      this.getPendingReviews(teacherId),
    ]);

    return {
      teacher: {
        id: teacher.id,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      },
      classes,
      studentRoster,
      assignedProjects,
      submissionQueue,
      pendingReviews,
      summary: {
        totalClasses: classes.length,
        totalStudents: studentRoster.length,
        totalAssignedProjects: assignedProjects.length,
        totalSubmissionsInQueue: submissionQueue.length,
        totalPendingReviews: pendingReviews.length,
      },
    };
  }

  private async getClasses(teacherId: string) {
    // Get all classes (teachers can see all classes in the system)
    // In a production system, you'd filter by school or ClassTeacher relationship
    const classes = await this.prisma.class.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get students from assignments to calculate student counts per class
    // Note: This is a simplified approach - ideally you'd have ClassStudent relationship
    const studentsFromAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        assignedBy: teacherId,
        deletedAt: null,
      },
      select: {
        studentId: true,
      },
      distinct: ['studentId'],
    });

    const uniqueStudentCount = studentsFromAssignments.length;

    return classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      grade: cls.grade,
      academicYear: cls.academicYear,
      school: cls.school,
      studentCount: uniqueStudentCount, // Total students assigned by this teacher
      isActive: cls.isActive,
      createdAt: cls.createdAt,
    }));
  }

  private async getStudentRoster(teacherId: string) {
    // Get all unique students from projects assigned by this teacher
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        assignedBy: teacherId,
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      distinct: ['studentId'],
    });

    // Get assignment counts and submission stats for each student
    const studentsWithStats = await Promise.all(
      assignments.map(async (assignment) => {
        const [assignmentCount, submissionCount, pendingCount] = await Promise.all([
          this.prisma.projectAssignment.count({
            where: {
              studentId: assignment.studentId,
              assignedBy: teacherId,
              deletedAt: null,
            },
          }),
          this.prisma.projectSubmission.count({
            where: {
              studentId: assignment.studentId,
              project: {
                assignments: {
                  some: {
                    assignedBy: teacherId,
                  },
                },
              },
              status: {
                in: ['submitted', 'approved', 'rejected', 'graded'],
              },
              deletedAt: null,
            },
          }),
          this.prisma.projectSubmission.count({
            where: {
              studentId: assignment.studentId,
              project: {
                assignments: {
                  some: {
                    assignedBy: teacherId,
                  },
                },
              },
              status: {
                in: ['submitted', 'under_review'],
              },
              deletedAt: null,
            },
          }),
        ]);

        return {
          id: assignment.student.id,
          email: assignment.student.email,
          firstName: assignment.student.firstName,
          lastName: assignment.student.lastName,
          isActive: assignment.student.isActive,
          stats: {
            totalAssignments: assignmentCount,
            totalSubmissions: submissionCount,
            pendingSubmissions: pendingCount,
          },
        };
      }),
    );

    // Remove duplicates
    const uniqueStudents = new Map();
    studentsWithStats.forEach((student) => {
      if (!uniqueStudents.has(student.id)) {
        uniqueStudents.set(student.id, student);
      }
    });

    return Array.from(uniqueStudents.values());
  }

  private async getAssignedProjects(teacherId: string) {
    // Get all projects assigned by this teacher
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        assignedBy: teacherId,
        deletedAt: null,
      },
      include: {
        project: {
          include: {
            template: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    // Group by project and aggregate stats
    const projectMap = new Map();

    for (const assignment of assignments) {
      const projectId = assignment.projectId;

      if (!projectMap.has(projectId)) {
        const [submissionStats, studentCount] = await Promise.all([
          this.getProjectSubmissionStats(projectId, teacherId),
          this.prisma.projectAssignment.count({
            where: {
              projectId,
              assignedBy: teacherId,
              deletedAt: null,
            },
          }),
        ]);

        projectMap.set(projectId, {
          id: assignment.project.id,
          name: assignment.project.name,
          description: assignment.project.description,
          status: assignment.project.status,
          startDate: assignment.project.startDate,
          endDate: assignment.project.endDate,
          template: assignment.project.template,
          assignedAt: assignment.assignedAt,
          stats: {
            totalStudents: studentCount,
            ...submissionStats,
          },
        });
      }
    }

    return Array.from(projectMap.values());
  }

  private async getProjectSubmissionStats(projectId: string, teacherId: string) {
    const [total, submitted, approved, rejected, pending] = await Promise.all([
      this.prisma.projectSubmission.count({
        where: {
          projectId,
          project: {
            assignments: {
              some: {
                assignedBy: teacherId,
              },
            },
          },
          deletedAt: null,
        },
      }),
      this.prisma.projectSubmission.count({
        where: {
          projectId,
          status: 'submitted',
          project: {
            assignments: {
              some: {
                assignedBy: teacherId,
              },
            },
          },
          deletedAt: null,
        },
      }),
      this.prisma.projectSubmission.count({
        where: {
          projectId,
          status: 'approved',
          project: {
            assignments: {
              some: {
                assignedBy: teacherId,
              },
            },
          },
          deletedAt: null,
        },
      }),
      this.prisma.projectSubmission.count({
        where: {
          projectId,
          status: 'rejected',
          project: {
            assignments: {
              some: {
                assignedBy: teacherId,
              },
            },
          },
          deletedAt: null,
        },
      }),
      this.prisma.projectSubmission.count({
        where: {
          projectId,
          status: {
            in: ['submitted', 'under_review'],
          },
          project: {
            assignments: {
              some: {
                assignedBy: teacherId,
              },
            },
          },
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalSubmissions: total,
      submitted,
      approved,
      rejected,
      pendingReview: pending,
    };
  }

  private async getSubmissionQueue(teacherId: string) {
    // Get all submissions for projects assigned by this teacher
    // Ordered by submission date, showing newest first
    const submissions = await this.prisma.projectSubmission.findMany({
      where: {
        project: {
          assignments: {
            some: {
              assignedBy: teacherId,
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            template: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignment: {
          select: {
            id: true,
            dueDate: true,
            status: true,
          },
        },
        _count: {
          select: {
            media: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 50, // Limit to most recent 50
    });

    return submissions.map((submission) => ({
      id: submission.id,
      project: submission.project,
      student: submission.student,
      status: submission.status,
      submittedAt: submission.submittedAt,
      grade: submission.grade ? Number(submission.grade) : null,
      assignment: submission.assignment,
      mediaCount: submission._count.media,
      isOverdue: submission.assignment?.dueDate
        ? new Date(submission.assignment.dueDate) < new Date()
        : false,
    }));
  }

  private async getPendingReviews(teacherId: string) {
    // Get submissions that need review (submitted or under_review status)
    // These are submissions for projects assigned by this teacher
    const pendingSubmissions = await this.prisma.projectSubmission.findMany({
      where: {
        status: {
          in: ['submitted', 'under_review'],
        },
        project: {
          assignments: {
            some: {
              assignedBy: teacherId,
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            template: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignment: {
          select: {
            id: true,
            dueDate: true,
            assignedAt: true,
          },
        },
        _count: {
          select: {
            media: true,
          },
        },
      },
      orderBy: [
        { submittedAt: 'asc' }, // Oldest first (FIFO queue)
      ],
    });

    return pendingSubmissions.map((submission) => ({
      id: submission.id,
      project: submission.project,
      student: submission.student,
      status: submission.status,
      submittedAt: submission.submittedAt,
      assignment: submission.assignment,
      mediaCount: submission._count.media,
      daysSinceSubmission: submission.submittedAt
        ? Math.floor(
            (new Date().getTime() - new Date(submission.submittedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
      isOverdue: submission.assignment?.dueDate
        ? new Date(submission.assignment.dueDate) < new Date()
        : false,
    }));
  }

  async getClassDetails(classId: string, teacherId: string) {
    // Verify teacher has access to this class (through project assignments)
    const hasAccess = await this.prisma.projectAssignment.findFirst({
      where: {
        assignedBy: teacherId,
        project: {
          // In a real system, you'd check ClassStudent relationship
        },
        deletedAt: null,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this class');
    }

    const classData = await this.prisma.class.findUnique({
      where: { id: classId, deletedAt: null },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!classData) {
      throw new ForbiddenException('Class not found');
    }

    // Get students from assignments for this class
    // This is a workaround - ideally you'd have ClassStudent relationship
    const students = await this.getStudentRoster(teacherId);

    return {
      ...classData,
      students,
    };
  }
}

