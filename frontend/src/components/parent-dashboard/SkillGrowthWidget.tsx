import { TrendingUp, Award, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SkillGrowthWidgetProps {
  skillGrowth: Array<{
    studentId: string;
    student: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    totalSkills: number;
    averageLevel: number;
    averageMaturity: number;
    skills: Array<{
      id: string;
      skill: {
        id: string;
        name: string;
        category?: string;
      };
      level: number;
      progress: number;
      maturity: number;
      endorsementDate: string;
    }>;
  }>;
}

const SkillGrowthWidget: React.FC<SkillGrowthWidgetProps> = ({ skillGrowth }) => {
  const getMaturityColor = (maturity: number) => {
    if (maturity >= 80) return 'bg-green-600';
    if (maturity >= 60) return 'bg-blue-600';
    if (maturity >= 40) return 'bg-yellow-600';
    if (maturity >= 20) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // Prepare chart data - timeline of skill endorsements
  const prepareTimelineData = () => {
    const timelineMap = new Map<string, number>();

    skillGrowth.forEach((child) => {
      child.skills.forEach((skill) => {
        const date = new Date(skill.endorsementDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      });
    });

    return Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, skills: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Prepare category distribution data
  const prepareCategoryData = () => {
    const categoryMap = new Map<string, number>();

    skillGrowth.forEach((child) => {
      child.skills.forEach((skill) => {
        const category = skill.skill.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
    });

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  };

  const timelineData = prepareTimelineData();
  const categoryData = prepareCategoryData();

  if (skillGrowth.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Skill Growth
        </h2>
        <p className="text-gray-500 text-center py-8">No skill data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-600" />
        Skill Growth
      </h2>

      {/* Charts */}
      <div className="space-y-6">
        {/* Timeline Chart */}
        {timelineData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Skills Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="skills"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Skills Earned"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Skills by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Skills" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-Child Skill Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Skills by Child</h3>
          {skillGrowth.map((child) => {
            const childName =
              `${child.student.firstName || ''} ${child.student.lastName || ''}`.trim() ||
              child.student.email;

            return (
              <div key={child.studentId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <h4 className="font-medium text-gray-900">{childName}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-600">
                        {child.totalSkills} skill{child.totalSkills !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      Avg Level: <span className="font-semibold">{child.averageLevel.toFixed(1)}</span>
                    </div>
                    <div className="text-gray-600">
                      Avg Maturity: <span className="font-semibold">{child.averageMaturity.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Skill Bars */}
                <div className="space-y-2">
                  {child.skills.slice(0, 5).map((skill) => (
                    <div key={skill.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{skill.skill.name}</span>
                        <span className="text-gray-600">
                          Level {skill.level} • {skill.maturity.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getMaturityColor(skill.maturity)}`}
                          style={{ width: `${Math.min(skill.maturity, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {child.skills.length > 5 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      +{child.skills.length - 5} more skill{child.skills.length - 5 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SkillGrowthWidget;

