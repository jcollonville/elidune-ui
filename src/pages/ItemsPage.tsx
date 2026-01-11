import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Filter, Search } from 'lucide-react';
import { Card, Button, Table, Badge, Pagination, SearchInput, Modal, Input } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { canManageItems } from '@/types';
import api from '@/services/api';
import type { ItemShort, Author } from '@/types';

const ITEMS_PER_PAGE = 20;

export default function ItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const MEDIA_TYPES = [
    { value: '', label: t('items.allTypes') },
    { value: 'book', label: t('items.book') },
    { value: 'dvd', label: t('items.dvd') },
    { value: 'cd', label: t('items.cd') },
    { value: 'magazine', label: t('items.magazine') },
  ];

  const [items, setItems] = useState<ItemShort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    title: '',
    author: '',
    identification: '',
  });

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getItems({
        freesearch: searchQuery || undefined,
        media_type: mediaType || undefined,
        title: advancedFilters.title || undefined,
        author: advancedFilters.author || undefined,
        identification: advancedFilters.identification || undefined,
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      });
      setItems(response.items);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, mediaType, advancedFilters, currentPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRowClick = (item: ItemShort) => {
    navigate(`/items/${item.id}`);
  };

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return '-';
    return authors
      .map((a) => `${a.firstname || ''} ${a.lastname || ''}`.trim())
      .join(', ');
  };

  const getStatusBadge = (status?: number) => {
    if (status === 0) return <Badge variant="success">{t('items.available')}</Badge>;
    if (status === 1) return <Badge variant="warning">{t('items.borrowed')}</Badge>;
    return <Badge>{t('items.unavailable')}</Badge>;
  };

  const columns = [
    {
      key: 'title',
      header: t('items.titleField'),
      render: (item: ItemShort) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {item.title || t('items.notSpecified')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {item.identification}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'authors',
      header: t('items.authors'),
      render: (item: ItemShort) => (
        <span className="text-gray-600 dark:text-gray-300">
          {formatAuthors(item.authors)}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('common.date'),
      render: (item: ItemShort) => item.date || '-',
      className: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item: ItemShort) => getStatusBadge(item.status),
    },
  ];

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('items.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('items.count', { count: totalItems })}
          </p>
        </div>
        {canManageItems(user?.account_type) && (
          <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
            {t('items.add')}
          </Button>
        )}
      </div>

      {/* Search and filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              placeholder={t('items.searchPlaceholder')}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={mediaType}
              onChange={(e) => {
                setMediaType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">{t('items.filters')}</span>
            </Button>
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t('items.titleField')}
                value={advancedFilters.title}
                onChange={(e) =>
                  setAdvancedFilters({ ...advancedFilters, title: e.target.value })
                }
                placeholder={t('z3950.titlePlaceholder')}
              />
              <Input
                label={t('items.author')}
                value={advancedFilters.author}
                onChange={(e) =>
                  setAdvancedFilters({ ...advancedFilters, author: e.target.value })
                }
                placeholder={t('z3950.authorPlaceholder')}
              />
              <Input
                label={t('items.isbn')}
                value={advancedFilters.identification}
                onChange={(e) =>
                  setAdvancedFilters({ ...advancedFilters, identification: e.target.value })
                }
                placeholder={t('z3950.isbnPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setAdvancedFilters({ title: '', author: '', identification: '' });
                  setCurrentPage(1);
                }}
              >
                {t('common.reset')}
              </Button>
              <Button onClick={fetchItems} leftIcon={<Search className="h-4 w-4" />}>
                {t('common.search')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Items table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={items}
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage={t('items.noItems')}
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
        title={t('items.add')}
        size="lg"
      >
        <CreateItemForm onSuccess={() => {
          setShowCreateModal(false);
          fetchItems();
        }} />
      </Modal>
    </div>
  );
}

interface CreateItemFormProps {
  onSuccess: () => void;
}

function CreateItemForm({ onSuccess }: CreateItemFormProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title1: '',
    identification: '',
    media_type: 'book',
    publication_date: '',
  });

  const MEDIA_TYPES = [
    { value: 'book', label: t('items.book') },
    { value: 'dvd', label: t('items.dvd') },
    { value: 'cd', label: t('items.cd') },
    { value: 'magazine', label: t('items.magazine') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.createItem(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('items.titleField')}
        value={formData.title1}
        onChange={(e) => setFormData({ ...formData, title1: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('items.isbn')}
          value={formData.identification}
          onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('items.mediaType')}
          </label>
          <select
            value={formData.media_type}
            onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {MEDIA_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Input
        label={t('items.publicationDate')}
        value={formData.publication_date}
        onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
        placeholder="YYYY"
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          {t('common.create')}
        </Button>
      </div>
    </form>
  );
}
