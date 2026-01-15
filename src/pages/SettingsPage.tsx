import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Plus, Trash2, Server, BookOpen } from 'lucide-react';
import { Card, CardHeader, Button, Input, Badge } from '@/components/common';
import api from '@/services/api';
import type { Settings, LoanSettings, Z3950Server, MediaType } from '@/types';

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

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLoanSetting = (index: number, field: keyof LoanSettings, value: string | number) => {
    if (!settings) return;
    const newSettings = { ...settings };
    newSettings.loan_settings[index] = {
      ...newSettings.loan_settings[index],
      [field]: value,
    };
    setSettings(newSettings);
  };

  const updateZ3950Server = (index: number, field: keyof Z3950Server, value: string | number | boolean) => {
    if (!settings) return;
    const newSettings = { ...settings };
    newSettings.z3950_servers[index] = {
      ...newSettings.z3950_servers[index],
      [field]: value,
    };
    setSettings(newSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
          {t('common.save')}
        </Button>
      </div>

      {/* Loan settings */}
      <Card>
        <CardHeader
          title={t('settings.loanSettings')}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('common.type')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('settings.durationDays')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('settings.maxLoans')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('settings.maxRenewals')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {settings.loan_settings.map((setting, index) => (
                <tr key={setting.media_type}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t(`items.mediaType.${getMediaTypeTranslationKey(setting.media_type)}`)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={setting.duration_days}
                      onChange={(e) => updateLoanSetting(index, 'duration_days', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      min={1}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={setting.max_loans}
                      onChange={(e) => updateLoanSetting(index, 'max_loans', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      min={1}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={setting.max_renewals}
                      onChange={(e) => updateLoanSetting(index, 'max_renewals', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Z39.50 servers */}
      <Card>
        <CardHeader
          title={t('settings.z3950Servers')}
          action={
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setSettings({
                  ...settings,
                  z3950_servers: [
                    ...settings.z3950_servers,
                    {
                      id: 0,
                      name: t('z3950.server'),
                      address: '',
                      port: 210,
                      database: '',
                      format: 'UNIMARC',
                      is_active: false,
                    },
                  ],
                });
              }}
            >
              {t('common.add')}
            </Button>
          }
        />
        <div className="space-y-4">
          {settings.z3950_servers.map((server, index) => (
            <div
              key={server.id || `new-${index}`}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {server.name || t('z3950.server')}
                  </span>
                  {server.is_active ? (
                    <Badge variant="success">{t('common.active')}</Badge>
                  ) : (
                    <Badge>{t('items.unavailable')}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSettings({
                      ...settings,
                      z3950_servers: settings.z3950_servers.filter((_, i) => i !== index),
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label={t('common.name')}
                  value={server.name}
                  onChange={(e) => updateZ3950Server(index, 'name', e.target.value)}
                />
                <Input
                  label={t('z3950.server')}
                  value={server.address}
                  onChange={(e) => updateZ3950Server(index, 'address', e.target.value)}
                />
                <Input
                  label="Port"
                  type="number"
                  value={server.port}
                  onChange={(e) => updateZ3950Server(index, 'port', parseInt(e.target.value))}
                />
                <Input
                  label="Database"
                  value={server.database || ''}
                  onChange={(e) => updateZ3950Server(index, 'database', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id={`active-${index}`}
                  checked={server.is_active}
                  onChange={(e) => updateZ3950Server(index, 'is_active', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`active-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.active')}
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

