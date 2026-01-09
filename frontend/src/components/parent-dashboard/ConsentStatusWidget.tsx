import { Shield, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ConsentStatusWidgetProps {
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
}

const ConsentStatusWidget: React.FC<ConsentStatusWidgetProps> = ({ consentStatus }) => {
  const getStatusIcon = (status: string, isExpired: boolean) => {
    if (isExpired) {
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'revoked':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (consentStatus.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" />
          Consent Status
        </h2>
        <p className="text-gray-500 text-center py-8">No consent records</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-600" />
        Consent Status
      </h2>
      <div className="space-y-3">
        {consentStatus.map((consent) => {
          const studentName =
            `${consent.student.firstName || ''} ${consent.student.lastName || ''}`.trim() ||
            consent.student.email;

          return (
            <div
              key={consent.id}
              className={`border rounded-lg p-3 ${getStatusColor(consent.status, consent.isExpired)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(consent.status, consent.isExpired)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1">{studentName}</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="font-semibold capitalize">{consent.status}</span>
                    </div>
                    {consent.consentDate && (
                      <div className="flex items-center justify-between">
                        <span>Consent Date:</span>
                        <span>{new Date(consent.consentDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {consent.revokedDate && (
                      <div className="flex items-center justify-between">
                        <span>Revoked:</span>
                        <span>{new Date(consent.revokedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {consent.isExpired && (
                      <div className="flex items-center gap-1 text-orange-700 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>Expired</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsentStatusWidget;

