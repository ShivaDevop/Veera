import { Award, ExternalLink, User } from 'lucide-react';
import { StudentSkill } from '../../services/skillWalletService';

interface SkillBarsViewProps {
  skills: StudentSkill[];
}

const SkillBarsView: React.FC<SkillBarsViewProps> = ({ skills }) => {
  const getMaturityColor = (level: number, progress: number) => {
    const totalMaturity = level * 10 + progress;
    
    if (totalMaturity >= 80) return 'bg-green-600';
    if (totalMaturity >= 60) return 'bg-blue-600';
    if (totalMaturity >= 40) return 'bg-yellow-600';
    if (totalMaturity >= 20) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const getMaturityLabel = (level: number, progress: number) => {
    const totalMaturity = level * 10 + progress;
    
    if (totalMaturity >= 80) return 'Expert';
    if (totalMaturity >= 60) return 'Advanced';
    if (totalMaturity >= 40) return 'Intermediate';
    if (totalMaturity >= 20) return 'Beginner';
    return 'Novice';
  };

  const getLevelColor = (level: number) => {
    if (level >= 8) return 'text-green-600 bg-green-100';
    if (level >= 6) return 'text-blue-600 bg-blue-100';
    if (level >= 4) return 'text-yellow-600 bg-yellow-100';
    if (level >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const skillsByCategory = skills.reduce((acc, skill) => {
    const category = skill.skill.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, StudentSkill[]>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
        <div key={category} className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            {category}
            <span className="text-sm font-normal text-gray-500">
              ({categorySkills.length})
            </span>
          </h2>

          <div className="space-y-4">
            {categorySkills.map((skill) => {
              const maturityColor = getMaturityColor(skill.level, skill.progress);
              const maturityLabel = getMaturityLabel(skill.level, skill.progress);
              const levelColor = getLevelColor(skill.level);
              const totalMaturity = skill.level * 10 + skill.progress;

              return (
                <div
                  key={skill.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{skill.skill.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${levelColor}`}
                        >
                          Level {skill.level}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {maturityLabel}
                        </span>
                      </div>
                      {skill.skill.description && (
                        <p className="text-sm text-gray-600 mt-1">{skill.skill.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Maturity</span>
                      <span className="font-medium text-gray-900">
                        {totalMaturity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${maturityColor}`}
                        style={{ width: `${Math.min(totalMaturity, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Progress: {skill.progress.toFixed(1)}%</span>
                      <span>Level: {skill.level}/10</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <ExternalLink className="w-4 h-4" />
                        <span className="font-medium">Project:</span>
                        <span className="text-gray-900">{skill.project.name}</span>
                      </div>
                      {skill.submission.grade !== null && (
                        <div className="text-gray-600">
                          <span className="font-medium">Grade:</span>{' '}
                          <span className="text-gray-900">{skill.submission.grade.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>
                          Endorsed by{' '}
                          {skill.endorsedBy.firstName && skill.endorsedBy.lastName
                            ? `${skill.endorsedBy.firstName} ${skill.endorsedBy.lastName}`
                            : skill.endorsedBy.email}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{formatDate(skill.endorsementDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillBarsView;

