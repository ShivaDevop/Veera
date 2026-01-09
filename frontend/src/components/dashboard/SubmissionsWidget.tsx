import { FileText, CheckCircle2, Clock, Star } from 'lucide-react';
import { ProjectSubmission } from '../../services/dashboardService';

interface SubmissionsWidgetProps {
  submissions: ProjectSubmission[];
}

const SubmissionsWidget: React.FC<SubmissionsWidgetProps> = ({ submissions }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-700';
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'returned':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
        <span className="ml-auto text-sm text-gray-600">{submissions.length} submitted</span>
      </div>

      {submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.submissionId}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(submission.status)}
                    <h3 className="font-semibold text-gray-900 truncate">
                      {submission.projectName}
                    </h3>
                  </div>
                  {submission.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {submission.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    submission.status,
                  )}`}
                >
                  {submission.status}
                </span>

                {submission.hasGrade && submission.grade !== null && (
                  <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{submission.grade.toFixed(1)}%</span>
                  </div>
                )}

                <span className="text-xs text-gray-500">
                  {formatDate(submission.submittedAt)}
                </span>
              </div>

              {submission.feedback && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-700">{submission.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No submissions yet</p>
        </div>
      )}
    </div>
  );
};

export default SubmissionsWidget;

