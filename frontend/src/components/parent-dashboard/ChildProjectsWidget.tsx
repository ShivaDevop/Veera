import { Briefcase, User, Calendar, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface ChildProjectsWidgetProps {
  projects: Array<{
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
}

const ChildProjectsWidget: React.FC<ChildProjectsWidgetProps> = ({ projects }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'graded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'submitted':
      case 'under_review':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (projects.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" />
          Child Projects
        </h2>
        <p className="text-gray-500 text-center py-8">No projects found</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-primary-600" />
        Child Projects
      </h2>
      <div className="space-y-4">
        {projects.map((item) => {
          const studentName =
            `${item.student.firstName || ''} ${item.student.lastName || ''}`.trim() ||
            item.student.email;
          const reviewerName = item.reviewer
            ? `${item.reviewer.firstName || ''} ${item.reviewer.lastName || ''}`.trim() ||
              item.reviewer.email
            : null;

          return (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{item.project.name}</h3>
                  {item.project.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{item.project.description}</p>
                  )}
                </div>
                <span
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    item.status,
                  )}`}
                >
                  {getStatusIcon(item.status)}
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="truncate">{studentName}</span>
                </div>

                {item.project.template && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {item.project.template.category}
                    </span>
                  </div>
                )}

                {item.submittedAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {item.grade !== null && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">Grade: {item.grade}%</span>
                  </div>
                )}

                {reviewerName && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs">Reviewed by: {reviewerName}</span>
                  </div>
                )}

                {item.mediaCount > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{item.mediaCount} file{item.mediaCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {item.feedback && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Feedback: </span>
                    {item.feedback}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChildProjectsWidget;

