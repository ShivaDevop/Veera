import { useEffect, useState } from 'react';
import { skillWalletService, SkillWalletData } from '../services/skillWalletService';
import SkillBarsView from '../components/skill-wallet/SkillBarsView';
import TimelineView from '../components/skill-wallet/TimelineView';
import { Award, Loader2, AlertCircle } from 'lucide-react';

const SkillWallet = () => {
  const [data, setData] = useState<SkillWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'bars' | 'timeline'>('bars');

  useEffect(() => {
    const fetchSkillWallet = async () => {
      try {
        setLoading(true);
        const walletData = await skillWalletService.getMyWallet();
        setData(walletData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load skill wallet');
      } finally {
        setLoading(false);
      }
    };

    fetchSkillWallet();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading skill wallet...</p>
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
          <button onClick={() => window.location.reload()} className="btn-primary">
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 p-2 rounded-lg">
                <Award className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Skill Wallet</h1>
                <p className="text-sm text-gray-600">
                  {data.totalSkills} {data.totalSkills === 1 ? 'skill' : 'skills'} earned
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode('bars')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'bars'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Skill Bars
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {data.skills.length === 0 ? (
          <div className="card text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Skills Yet</h3>
            <p className="text-gray-600">
              Skills will appear here after you complete approved projects and receive teacher
              endorsement.
            </p>
          </div>
        ) : viewMode === 'bars' ? (
          <SkillBarsView skills={data.skills} />
        ) : (
          <TimelineView skills={data.skills} />
        )}
      </main>
    </div>
  );
};

export default SkillWallet;

