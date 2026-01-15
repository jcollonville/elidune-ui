import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Users,
  BookMarked,
  AlertTriangle,
  User,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardHeader, Badge, Table } from '@/components/common';
import StatsFilters from '@/components/stats/StatsFilters';
import api from '@/services/api';
import type { Stats, AdvancedStatsParams, MediaType } from '@/types';

// Helper function to get translation key for media type
function getMediaTypeTranslationKey(mediaType: MediaType): string {
  const keyMap: Record<MediaType, string> = {
    'u': 'unknown',
    'b': 'printedText',
    'bc': 'comics',
    'p': 'periodic',
    'v': 'video',
    'vt': 'videoTape',
    'vd': 'videoDvd',
    'a': 'audio',
    'am': 'audioMusic',
    'amt': 'audioMusicTape',
    'amc': 'audioMusicCd',
    'an': 'audioNonMusic',
    'c': 'cdRom',
    'i': 'images',
    'm': 'multimedia',
  };
  return keyMap[mediaType] || 'unknown';
}

interface LoanTimeData {
  date: string;
  loans: number;
  returns: number;
}

interface UserStatsData {
  user_id: number;
  firstname: string;
  lastname: string;
  total_loans: number;
  active_loans: number;
  overdue_loans: number;
}


export default function StatsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced stats state
  const [isLoadingAdvancedStats, setIsLoadingAdvancedStats] = useState(false);
  const [statsParams, setStatsParams] = useState<AdvancedStatsParams | null>(null);
  
  // Timeline state
  const [timelineData, setTimelineData] = useState<LoanTimeData[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  
  // User stats state
  const [userStats, setUserStats] = useState<UserStatsData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSortBy, setUserSortBy] = useState<'total_loans' | 'active_loans' | 'overdue_loans'>('total_loans');

  // Fetch main stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch advanced stats
  useEffect(() => {
    if (!statsParams) {
      // Use default time range if no params set (30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      // Convert to ISO 8601 format with time
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const defaultParams: AdvancedStatsParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        interval: 'day',
      };
      setStatsParams(defaultParams);
      return;
    }

    const fetchAdvancedStats = async () => {
      setIsLoadingAdvancedStats(true);
      setIsLoadingTimeline(true);
      try {
        const response = await api.getLoanStats(statsParams);
        setTimelineData(response.time_series.map(item => ({
          date: item.period,
          loans: item.loans,
          returns: item.returns,
        })));
      } catch (error) {
        console.error('Error fetching loan stats:', error);
        setTimelineData([]);
      } finally {
        setIsLoadingAdvancedStats(false);
        setIsLoadingTimeline(false);
      }
    };

    fetchAdvancedStats();
  }, [statsParams]);

  // Generate mock user stats for demo
  const generateMockUserStats = (sortBy: typeof userSortBy): UserStatsData[] => {
    const names = [
      { firstname: 'Marie', lastname: 'Dupont' },
      { firstname: 'Jean', lastname: 'Martin' },
      { firstname: 'Sophie', lastname: 'Bernard' },
      { firstname: 'Pierre', lastname: 'Petit' },
      { firstname: 'Claire', lastname: 'Robert' },
      { firstname: 'Lucas', lastname: 'Richard' },
      { firstname: 'Emma', lastname: 'Moreau' },
      { firstname: 'Hugo', lastname: 'Simon' },
    ];
    
    return names.map((name, i) => ({
      user_id: i + 1,
      ...name,
      total_loans: Math.floor(Math.random() * 50) + 5,
      active_loans: Math.floor(Math.random() * 5),
      overdue_loans: Math.floor(Math.random() * 3),
    })).sort((a, b) => b[sortBy] - a[sortBy]);
  };

  // Fetch user stats (using mock data since /stats/users endpoint doesn't exist)
  useEffect(() => {
    setIsLoadingUsers(true);
    // Simulate API call delay
    const timer = setTimeout(() => {
      setUserStats(generateMockUserStats(userSortBy));
      setIsLoadingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSortBy]);

  const formatDate = (dateStr: string) => {
    const interval = statsParams?.interval || 'day';
    
    // Handle ISO week format (YYYY-Www)
    if (interval === 'week' && /^\d{4}-W\d{2}$/.test(dateStr)) {
      const [year, week] = dateStr.split('-W');
      return t('stats.weekFormat', { year, week });
    }
    
    // Try to parse as date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If not a valid date, return as is
      return dateStr;
    }
    
    switch (interval) {
      case 'year':
        return date.toLocaleDateString(i18n.language, { year: 'numeric' });
      case 'month':
        return date.toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' });
      case 'week':
        return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
      case 'day':
      default:
        return date.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' });
    }
  };

  const userColumns = [
    {
      key: 'name',
      header: t('nav.users'),
      render: (user: UserStatsData) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {user.firstname?.[0]}{user.lastname?.[0]}
            </span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {user.firstname} {user.lastname}
          </span>
        </div>
      ),
    },
    {
      key: 'total_loans',
      header: t('stats.totalLoans'),
      render: (user: UserStatsData) => (
        <span className="text-gray-600 dark:text-gray-300">{user.total_loans}</span>
      ),
    },
    {
      key: 'active_loans',
      header: t('stats.activeLoansSort'),
      render: (user: UserStatsData) => (
        <Badge variant={user.active_loans > 0 ? 'info' : 'default'}>
          {user.active_loans}
        </Badge>
      ),
    },
    {
      key: 'overdue_loans',
      header: t('stats.overdueLoansSort'),
      render: (user: UserStatsData) => (
        user.overdue_loans > 0 ? (
          <Badge variant="danger">{user.overdue_loans}</Badge>
        ) : (
          <span className="text-gray-400">0</span>
        )
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stats.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('stats.subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label={t('stats.documents')}
          value={stats.items.total}
          color="indigo"
        />
        <StatCard
          icon={Users}
          label={t('stats.activeUsers')}
          value={stats.users.active}
          subtitle={t('stats.totalUsers', { count: stats.users.total })}
          color="emerald"
        />
        <StatCard
          icon={BookMarked}
          label={t('stats.activeLoans')}
          value={stats.loans.active}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('stats.overdue')}
          value={stats.loans.overdue}
          color="red"
        />
      </div>

      {/* Advanced Stats Filters */}
      <Card>
        <StatsFilters
          onFiltersChange={setStatsParams}
          isLoading={isLoadingAdvancedStats}
        />
      </Card>

      {/* Timeline chart */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <CardHeader
            title={t('stats.loansEvolution')}
            subtitle={statsParams?.media_type 
              ? t('stats.loansByType', { 
                  type: t(`items.mediaType.${getMediaTypeTranslationKey(statsParams.media_type)}`)
                })
              : t('stats.loansPerDay')
            }
          />
        </div>

        {(isLoadingTimeline || isLoadingAdvancedStats) ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-500"
                />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} className="text-gray-500" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                    borderRadius: '0.5rem',
                  }}
                  labelFormatter={(label) => {
                    const interval = statsParams?.interval || 'day';
                    
                    // Handle ISO week format (YYYY-Www)
                    if (interval === 'week' && /^\d{4}-W\d{2}$/.test(label)) {
                      const [year, week] = label.split('-W');
                      return t('stats.weekFormat', { year, week });
                    }
                    
                    // Try to parse as date
                    const date = new Date(label);
                    if (isNaN(date.getTime())) {
                      return label;
                    }
                    
                    return date.toLocaleDateString(i18n.language, {
                      weekday: interval === 'day' ? 'long' : undefined,
                      day: 'numeric',
                      month: 'long',
                      year: interval === 'year' ? 'numeric' : undefined,
                    });
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="loans"
                  name={t('stats.chart.loans')}
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorLoans)"
                />
                <Area
                  type="monotone"
                  dataKey="returns"
                  name={t('stats.chart.returns')}
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorReturns)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items by media type */}
        <Card>
          <CardHeader title={t('stats.documentsByType')} />
          <div className="space-y-3">
            {stats.items.by_media_type.map((entry) => (
              <ProgressBar
                key={entry.label}
                label={entry.label}
                value={entry.value}
                max={stats.items.total}
                color="indigo"
              />
            ))}
          </div>
        </Card>

        {/* Loans by media type - Bar chart */}
        <Card>
          <CardHeader title={t('stats.loansByDocumentType')} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.loans.by_media_type} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="value" name={t('stats.chart.loans')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* User statistics */}
      <Card padding="none">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('stats.userStats')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('stats.topBorrowers')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('stats.sortBy')}</span>
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as typeof userSortBy)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="total_loans">{t('stats.totalLoans')}</option>
                <option value="active_loans">{t('stats.activeLoansSort')}</option>
                <option value="overdue_loans">{t('stats.overdueLoansSort')}</option>
              </select>
            </div>
          </div>
        </div>

        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            columns={userColumns}
            data={userStats}
            keyExtractor={(user) => user.user_id}
            onRowClick={(user) => navigate(`/users/${user.user_id}`)}
            emptyMessage={t('common.noResults')}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by account type */}
        <Card>
          <CardHeader title={t('stats.usersByAccountType')} />
          <div className="space-y-3">
            {stats.users.by_account_type.map((entry) => (
              <ProgressBar
                key={entry.label}
                label={entry.label}
                value={entry.value}
                max={stats.users.total}
                color="emerald"
              />
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader title={t('stats.todayActivity')} />
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.loans.returned_today}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">{t('stats.returnedToday')}</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {stats.loans.overdue}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{t('stats.overdue')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtitle?: string;
  color: 'indigo' | 'emerald' | 'blue' | 'red';
}

function StatCard({ icon: Icon, label, value, subtitle, color }: StatCardProps) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: 'indigo' | 'emerald' | 'blue' | 'red';
}

function ProgressBar({ label, value, max, color }: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  const colors = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
