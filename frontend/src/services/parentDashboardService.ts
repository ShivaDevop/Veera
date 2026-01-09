import { api } from './api';

export interface ParentDashboardData {
  parent: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  children: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    isActive: boolean;
    consentDate?: string;
  }>;
  childProjects: Array<{
    id: string;
    project: {
      id: string;
      name: string;
      description?: string;
      status: string;
      template?: {
        id: string;
        title: string;
        category: string;
      };
    };
    student: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    status: string;
    submittedAt?: string;
    reviewedAt?: string;
    grade: number | null;
    feedback?: string;
    reviewer?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    mediaCount: number;
  }>;
  skillGrowth: Array<{
    studentId: string;
    student: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    totalSkills: number;
    averageLevel: number;
    averageMaturity: number;
    skills: Array<{
      id: string;
      skill: {
        id: string;
        name: string;
        category?: string;
        description?: string;
      };
      level: number;
      progress: number;
      maturity: number;
      project: {
        id: string;
        name: string;
        template?: {
          category: string;
        };
      };
      endorsedBy: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
      };
      endorsementDate: string;
      lastUpdated: string;
    }>;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
  }>;
  consentStatus: Array<{
    id: string;
    student: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    status: string;
    consentGiven: boolean;
    consentDate?: string;
    revokedDate?: string;
    isExpired: boolean;
  }>;
  summary: {
    totalChildren: number;
    totalProjects: number;
    totalSkills: number;
    unreadNotifications: number;
  };
}

export interface ChildDetailsData {
  child: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    isActive: boolean;
  };
  projects: Array<any>;
  skills: {
    studentId: string;
    student: any;
    totalSkills: number;
    averageLevel: number;
    averageMaturity: number;
    skills: Array<any>;
  };
  consent: {
    id: string;
    status: string;
    consentGiven: boolean;
    consentDate?: string;
    revokedDate?: string;
  };
}

export const parentDashboardService = {
  getMyDashboard: async (): Promise<ParentDashboardData> => {
    const response = await api.get('/parent-dashboard/my-dashboard');
    return response.data;
  },

  getChildDetails: async (childId: string): Promise<ChildDetailsData> => {
    const response = await api.get(`/parent-dashboard/children/${childId}`);
    return response.data;
  },
};

