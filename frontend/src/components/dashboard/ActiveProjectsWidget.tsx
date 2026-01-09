import { Briefcase, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProjectAssignment } from '../../services/dashboardService';

interface ActiveProjectsWidgetProps {
  assignments: ProjectAssignment[];
}

const ActiveProjectsWidget: React.FC<ActiveProjectsWidgetProps> = ({ assignments }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <Briefcase className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
        <span className="ml-auto text-sm text-gray-600">{assignments.length} active</span>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{assignment.projectName}</h3>
                  {assignment.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}
                </div>
                {assignment.hasSubmission && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                {assignment.dueDate && (
                  <div
                    className={`flex items-center gap-1 ${
                      assignment.isOverdue ? 'text-red-600' : 'text-gray-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>
                      {assignment.isOverdue
                        ? `Overdue by ${Math.abs(assignment.daysUntilDue || 0)} days`
                        : assignment.daysUntilDue !== null
                        ? `${assignment.daysUntilDue} days left`
                        : 'No due date'}
                    </span>
                  </div>
                )}

                {assignment.isOverdue && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Overdue</span>
                  </div>
                )}

                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    assignment.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {assignment.status.replace('_', ' ')}
                </span>
              </div>

              {assignment.dueDate && (
                <p className="text-xs text-gray-500 mt-2">
                  Due: {formatDate(assignment.dueDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No active project assignments</p>
        </div>
      )}
    </div>
  );
};

export default ActiveProjectsWidget;

