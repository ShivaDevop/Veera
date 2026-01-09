import { Award, TrendingUp, BarChart3 } from 'lucide-react';
import { SkillSnapshot } from '../../services/dashboardService';

interface SkillBarsWidgetProps {
  data: SkillSnapshot;
}

const SkillBarsWidget: React.FC<SkillBarsWidgetProps> = ({ data }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
        </div>
        <span className="text-sm text-gray-600">{data.totalSkills} total</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-gray-600">Average Level</span>
          </div>
          <p className="text-2xl font-bold text-primary-600">{data.averageLevel.toFixed(1)}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">Avg Progress</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.averageProgress.toFixed(1)}%</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600">Categories</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{data.categoriesCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Recent Skills</h3>
        {data.recentSkills.length > 0 ? (
          <div className="space-y-3">
            {data.recentSkills.map((skill) => (
              <div key={skill.skillId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{skill.skillName}</span>
                  <span className="text-gray-600">
                    Level {skill.level} • {skill.progress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
                {skill.category && (
                  <span className="text-xs text-gray-500">{skill.category}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No skills yet</p>
        )}
      </div>

      {Object.keys(data.skillsByCategory).length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Skills by Category</h3>
          <div className="space-y-4">
            {Object.entries(data.skillsByCategory).map(([category, skills]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                <div className="space-y-2">
                  {skills.slice(0, 3).map((skill) => (
                    <div key={skill.skillId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{skill.skillName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full"
                            style={{ width: `${skill.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {skill.progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillBarsWidget;

