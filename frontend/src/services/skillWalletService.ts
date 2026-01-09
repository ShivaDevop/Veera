import { api } from './api';

export interface SkillInfo {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  status: string;
}

export interface SubmissionInfo {
  id: string;
  status: string;
  grade: number | null;
  submittedAt: string;
}

export interface EndorserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface StudentSkill {
  id: string;
  skill: SkillInfo;
  level: number;
  progress: number;
  project: ProjectInfo;
  submission: SubmissionInfo;
  endorsedBy: EndorserInfo;
  endorsementDate: string;
  lastUpdated: string;
  createdAt: string;
}

export interface SkillWalletData {
  studentId: string;
  totalSkills: number;
  skills: StudentSkill[];
}

export const skillWalletService = {
  async getMyWallet(): Promise<SkillWalletData> {
    const response = await api.get('/skill-wallet/my-wallet');
    return response.data;
  },

  async getStudentWallet(studentId: string): Promise<SkillWalletData> {
    const response = await api.get(`/skill-wallet/student/${studentId}`);
    return response.data;
  },
};

