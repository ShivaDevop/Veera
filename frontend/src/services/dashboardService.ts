import { api } from './api';

export interface SkillSnapshot {
  totalSkills: number;
  averageLevel: number;
  averageProgress: number;
  categoriesCount: number;
  skillsByCategory: Record<string, SkillInfo[]>;
  recentSkills: SkillInfo[];
}

export interface SkillInfo {
  skillId: string;
  skillName: string;
  category?: string;
  description?: string;
  level: number;
  progress: number;
  lastUpdated: string;
}

export interface ProjectAssignment {
  assignmentId: string;
  projectId: string;
  projectName: string;
  description?: string;
  status: string;
  assignedAt: string;
  dueDate?: string;
  isOverdue: boolean;
  daysUntilDue: number | null;
  notes?: string;
  hasSubmission: boolean;
}

export interface ProjectSubmission {
  submissionId: string;
  projectId: string;
  projectName: string;
  description?: string;
  status: string;
  submittedAt: string;
  grade: number | null;
  feedback?: string;
  hasGrade: boolean;
}

export interface Badge {
  badgeId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  earnedAt: string;
}

export interface BadgesData {
  totalBadges: number;
  categoriesCount: number;
  badgesByCategory: Record<string, Badge[]>;
  recentBadges: Badge[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsData {
  total: number;
  unreadCount: number;
  notifications: Notification[];
}

export interface DashboardData {
  skillSnapshot: SkillSnapshot;
  activeProjectAssignments: ProjectAssignment[];
  submittedProjects: ProjectSubmission[];
  badges: BadgesData;
  notifications: NotificationsData;
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get('/student-dashboard/my-dashboard');
    return response.data;
  },
};

