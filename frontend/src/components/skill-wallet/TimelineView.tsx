import { Award, ExternalLink, User, Calendar, TrendingUp } from 'lucide-react';
import { StudentSkill } from '../../services/skillWalletService';

interface TimelineViewProps {
  skills: StudentSkill[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ skills }) => {
  const sortedSkills = [...skills].sort(
    (a, b) =>
      new Date(b.endorsementDate).getTime() - new Date(a.endorsementDate).getTime(),
  );

  const getMaturityColor = (level: number, progress: number) => {
    const totalMaturity = level * 10 + progress;
    if (totalMaturity >= 80) return 'border-green-500 bg-green-50';
    if (totalMaturity >= 60) return 'border-blue-500 bg-blue-50';
    if (totalMaturity >= 40) return 'border-yellow-500 bg-yellow-50';
    if (totalMaturity >= 20) return 'border-orange-500 bg-orange-50';
    return 'border-red-500 bg-red-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      year: date.getFullYear(),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      full: date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  };

  const groupByYear = (skills: StudentSkill[]) => {
    return skills.reduce((acc, skill) => {
      const year = new Date(skill.endorsementDate).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(skill);
      return acc;
    }, {} as Record<number, StudentSkill[]>);
  };

  const groupedSkills = groupByYear(sortedSkills);
  const years = Object.keys(groupedSkills)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Skill Timeline</h2>
      </div>

      <div className="relative">
        {years.map((year, yearIndex) => (
          <div key={year} className={yearIndex > 0 ? 'mt-8' : ''}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-300 flex-1" />
              <h3 className="text-lg font-bold text-gray-900 px-3">{year}</h3>
              <div className="h-px bg-gray-300 flex-1" />
            </div>

            <div className="relative pl-8 border-l-2 border-gray-200 ml-4">
              {groupedSkills[year].map((skill, skillIndex) => {
                const dateInfo = formatDate(skill.endorsementDate);
                const maturityColor = getMaturityColor(skill.level, skill.progress);
                const totalMaturity = skill.level * 10 + skill.progress;

                return (
                  <div
                    key={skill.id}
                    className={`relative mb-6 ${skillIndex < groupedSkills[year].length - 1 ? 'pb-6' : ''}`}
                  >
                    <div
                      className={`absolute -left-[34px] top-0 w-6 h-6 rounded-full border-4 border-white ${maturityColor.split(' ')[0]} bg-white flex items-center justify-center`}
                    >
                      <div className={`w-2 h-2 rounded-full ${maturityColor.split(' ')[1].replace('bg-', 'bg-').split('-')[0]}-600`} />
                    </div>

                    <div
                      className={`border-2 rounded-lg p-4 ${maturityColor} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-5 h-5 text-primary-600" />
                            <h4 className="font-semibold text-gray-900">{skill.skill.name}</h4>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-300">
                              Level {skill.level}
                            </span>
                          </div>
                          {skill.skill.category && (
                            <p className="text-xs text-gray-500 mb-2">{skill.skill.category}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {totalMaturity.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Maturity</div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(totalMaturity, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Progress: {skill.progress.toFixed(1)}%</span>
                          <span>Level: {skill.level}/10</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-white/50">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <ExternalLink className="w-4 h-4" />
                          <span className="font-medium">Project:</span>
                          <span>{skill.project.name}</span>
                        </div>

                        {skill.submission.grade !== null && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium">Grade:</span>
                            <span>{skill.submission.grade.toFixed(1)}%</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="w-4 h-4" />
                          <span className="font-medium">Endorsed by:</span>
                          <span>
                            {skill.endorsedBy.firstName && skill.endorsedBy.lastName
                              ? `${skill.endorsedBy.firstName} ${skill.endorsedBy.lastName}`
                              : skill.endorsedBy.email}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{dateInfo.full} at {dateInfo.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;

