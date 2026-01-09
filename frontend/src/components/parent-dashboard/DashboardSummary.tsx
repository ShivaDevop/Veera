import { Users, Briefcase, Award, Bell } from 'lucide-react';

interface SummaryProps {
  summary: {
    totalChildren: number;
    totalProjects: number;
    totalSkills: number;
    unreadNotifications: number;
  };
}

const DashboardSummary: React.FC<SummaryProps> = ({ summary }) => {
  const cards = [
    {
      title: 'Children',
      value: summary.totalChildren,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Projects',
      value: summary.totalProjects,
      icon: Briefcase,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Skills',
      value: summary.totalSkills,
      icon: Award,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Unread',
      value: summary.unreadNotifications,
      icon: Bell,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardSummary;

