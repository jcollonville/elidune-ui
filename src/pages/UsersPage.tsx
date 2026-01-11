import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Mail, Phone, BookMarked, AlertTriangle } from 'lucide-react';
import { Card, Button, Table, Badge, Pagination, SearchInput, Modal, Input } from '@/components/common';
import api from '@/services/api';
import type { UserShort } from '@/types';

const USERS_PER_PAGE = 20;

export default function UsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserShort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getUsers({
        name: searchQuery || undefined,
        page: currentPage,
        per_page: USERS_PER_PAGE,
      });
      setUsers(response.items);
      setTotalUsers(response.total);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRowClick = (user: UserShort) => {
    navigate(`/users/${user.id}`);
  };

  const columns = [
    {
      key: 'name',
      header: t('common.name'),
      render: (user: UserShort) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {user.firstname?.[0] || '?'}{user.lastname?.[0] || ''}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.firstname} {user.lastname}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.account_type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'loans',
      header: t('users.loans'),
      render: (user: UserShort) => (
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-gray-400" />
          <span>{user.nb_loans || 0}</span>
          {(user.nb_late_loans || 0) > 0 && (
            <Badge variant="danger" size="sm">
              {user.nb_late_loans} {t('users.lateLoans')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (user: UserShort) =>
        (user.nb_late_loans || 0) > 0 ? (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{t('users.late')}</span>
          </div>
        ) : (
          <Badge variant="success">OK</Badge>
        ),
    },
  ];

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('users.count', { count: totalUsers })}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          {t('users.newUser')}
        </Button>
      </div>

      {/* Search */}
      <Card>
        <SearchInput
          value={searchQuery}
          onChange={handleSearch}
          placeholder={t('users.searchPlaceholder')}
        />
      </Card>

      {/* Users table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(user) => user.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage={t('users.noUsers')}
        />
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('users.newUser')}
        size="lg"
      >
        <CreateUserForm onSuccess={() => {
          setShowCreateModal(false);
          fetchUsers();
        }} />
      </Modal>
    </div>
  );
}

interface CreateUserFormProps {
  onSuccess: () => void;
}

function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    barcode: '',
    account_type: 'Reader',
  });

  const ACCOUNT_TYPES = [
    { value: 'Reader', label: t('users.reader') },
    { value: 'Librarian', label: t('users.librarian') },
    { value: 'Administrator', label: t('users.administrator') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.createUser(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('profile.firstName')}
          value={formData.firstname}
          onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
          required
        />
        <Input
          label={t('profile.lastName')}
          value={formData.lastname}
          onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('users.identifier')}
          value={formData.login}
          onChange={(e) => setFormData({ ...formData, login: e.target.value })}
          required
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('profile.email')}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          leftIcon={<Mail className="h-4 w-4" />}
        />
        <Input
          label={t('profile.phone')}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          leftIcon={<Phone className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('profile.barcode')}
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('profile.accountType')}
          </label>
          <select
            value={formData.account_type}
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          {t('common.create')}
        </Button>
      </div>
    </form>
  );
}
