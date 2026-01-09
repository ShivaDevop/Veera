import { useEffect, useState } from 'react';
import {
  parentDashboardService,
  ParentDashboardData,
} from '../services/parentDashboardService';
import ChildrenListWidget from '../components/parent-dashboard/ChildrenListWidget';
import ChildProjectsWidget from '../components/parent-dashboard/ChildProjectsWidget';
import SkillGrowthWidget from '../components/parent-dashboard/SkillGrowthWidget';
import NotificationsWidget from '../components/parent-dashboard/NotificationsWidget';
import ConsentStatusWidget from '../components/parent-dashboard/ConsentStatusWidget';
import DashboardSummary from '../components/parent-dashboard/DashboardSummary';
import { Loader2, AlertCircle, Download } from 'lucide-react';

const ParentDashboard = () => {
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const dashboardData = await parentDashboardService.getMyDashboard();
        setData(dashboardData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleDownloadReport = () => {
    if (!data) return;

    // Generate report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      parent: data.parent,
      summary: data.summary,
      children: data.children.map((child) => ({
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim() || child.email,
        email: child.email,
        projects: data.childProjects.filter((p) => p.student.id === child.id).length,
        skills: data.skillGrowth.find((sg) => sg.studentId === child.id)?.totalSkills || 0,
      })),
      skillGrowth: data.skillGrowth.map((sg) => ({
        student: `${sg.student.firstName || ''} ${sg.student.lastName || ''}`.trim() || sg.student.email,
        totalSkills: sg.totalSkills,
        averageLevel: sg.averageLevel.toFixed(2),
        averageMaturity: sg.averageMaturity.toFixed(2),
        skills: sg.skills.map((s) => ({
          name: s.skill.name,
          category: s.skill.category || 'Uncategorized',
          level: s.level,
          progress: s.progress,
          maturity: s.maturity,
        })),
      })),
      projects: data.childProjects.map((p) => ({
        project: p.project.name,
        student: `${p.student.firstName || ''} ${p.student.lastName || ''}`.trim() || p.student.email,
        status: p.status,
        grade: p.grade,
        submittedAt: p.submittedAt,
      })),
    };

    // Convert to JSON and download
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parent-dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome, {data.parent.firstName || data.parent.email}
            </p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

        {/* Summary Cards */}
        <DashboardSummary summary={data.summary} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Children List */}
            <ChildrenListWidget children={data.children} />

            {/* Skill Growth Visualization */}
            <SkillGrowthWidget skillGrowth={data.skillGrowth} />

            {/* Child Projects */}
            <ChildProjectsWidget projects={data.childProjects} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notifications */}
            <NotificationsWidget notifications={data.notifications} />

            {/* Consent Status */}
            <ConsentStatusWidget consentStatus={data.consentStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;

