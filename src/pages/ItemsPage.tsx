import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Filter, Search, Globe, Loader2, AlertCircle, CheckCircle, Video, Music, Image, FileText, Disc, Newspaper, Trash2 } from 'lucide-react';
import { Card, Button, Table, Badge, SearchInput, Modal, Input } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { canManageItems, type MediaType, type MediaTypeOption } from '@/types';
import api from '@/services/api';
import type { ItemShort, Author, Z3950Server, ImportReport, DuplicateConfirmationRequired, Source } from '@/types';
import CallNumberField from '@/components/specimen/CallNumberField';
import { buildSuggestedCallNumber, validateCallNumber } from '@/utils/callNumber';
import { PUBLIC_TYPE_OPTIONS } from '@/utils/codeLabels';
import type { AxiosError } from 'axios';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 20;

function getDuplicateConfirmationRequired(error: unknown): DuplicateConfirmationRequired | null {
  const ax = error as AxiosError<any>;
  if (ax?.response?.status !== 409) return null;
  const data = ax.response?.data as Partial<DuplicateConfirmationRequired> | undefined;
  if (!data) return null;
  if (data.code !== 'duplicate_isbn_needs_confirmation') return null;
  if (typeof data.existing_id !== 'string') return null;
  if (typeof data.message !== 'string') return null;
  return data as DuplicateConfirmationRequired;
}

export default function ItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const MEDIA_TYPES: MediaTypeOption[] = [
    { value: '', label: t('items.allTypes') },
    { value: 'u', label: t('items.mediaType.unknown') },
    { value: 'b', label: t('items.mediaType.printedText') },
    { value: 'bc', label: t('items.mediaType.comics') },
    { value: 'p', label: t('items.mediaType.periodic') },
    { value: 'v', label: t('items.mediaType.video') },
    { value: 'vt', label: t('items.mediaType.videoTape') },
    { value: 'vd', label: t('items.mediaType.videoDvd') },
    { value: 'a', label: t('items.mediaType.audio') },
    { value: 'am', label: t('items.mediaType.audioMusic') },
    { value: 'amt', label: t('items.mediaType.audioMusicTape') },
    { value: 'amc', label: t('items.mediaType.audioMusicCd') },
    { value: 'an', label: t('items.mediaType.audioNonMusic') },
    { value: 'c', label: t('items.mediaType.cdRom') },
    { value: 'i', label: t('items.mediaType.images') },
    { value: 'm', label: t('items.mediaType.multimedia') },
  ];

  // Filters – init from URL so returning from item detail restores search
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('freesearch') ?? '');
  const [mediaType, setMediaType] = useState<MediaType | ''>(
    () => (searchParams.get('media_type') || '') as MediaType | ''
  );
  const [audienceType, setAudienceType] = useState<string>(() => searchParams.get('audience_type') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(() => ({
    title: searchParams.get('title') ?? '',
    author: searchParams.get('author') ?? '',
    isbn: searchParams.get('isbn') ?? '',
  }));

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data,
    isLoading: isItemsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'items',
      {
        searchQuery,
        mediaType,
        audienceType,
        advancedFilters,
      },
    ],
    queryFn: async ({ pageParam }) => {
      return api.getItems({
        freesearch: searchQuery || undefined,
        media_type: mediaType || undefined,
        audience_type: audienceType ? parseInt(audienceType, 10) : undefined,
        title: advancedFilters.title || undefined,
        author: advancedFilters.author || undefined,
        isbn: advancedFilters.isbn || undefined,
        page: pageParam,
        per_page: PAGE_SIZE,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.items?.length) return undefined;
      const loaded = lastPage.page * lastPage.per_page;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const totalItems = data?.pages[0]?.total ?? 0;

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    const scrollRoot = el?.closest('.items-list-scroll') ?? null;
    if (!el || !scrollRoot || !hasNextPage || isFetchingNextPage || !data?.pages?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { root: scrollRoot, rootMargin: '200px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages?.length]);

  // Restore last search from sessionStorage when (re)entering the page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('itemsPageState');
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        searchQuery?: string;
        mediaType?: MediaType | '';
        audienceType?: string;
        advancedFilters?: { title?: string; author?: string; isbn?: string };
      };
      if (typeof saved.searchQuery === 'string') setSearchQuery(saved.searchQuery);
      if (typeof saved.mediaType === 'string') setMediaType(saved.mediaType as MediaType | '');
      if (typeof saved.audienceType === 'string') setAudienceType(saved.audienceType);
      if (saved.advancedFilters && typeof saved.advancedFilters === 'object') {
        setAdvancedFilters((prev) => ({
          ...prev,
          ...saved.advancedFilters,
        }));
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Persist search state in URL + sessionStorage so it survives navigation
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set('freesearch', searchQuery);
    if (mediaType) next.set('media_type', mediaType);
    if (audienceType) next.set('audience_type', audienceType);
    if (advancedFilters.title) next.set('title', advancedFilters.title);
    if (advancedFilters.author) next.set('author', advancedFilters.author);
    if (advancedFilters.isbn) next.set('isbn', advancedFilters.isbn);
    setSearchParams(next, { replace: true });

    try {
      sessionStorage.setItem(
        'itemsPageState',
        JSON.stringify({
          searchQuery,
          mediaType,
          audienceType,
          advancedFilters,
        })
      );
    } catch {
      // ignore quota / storage errors
    }
  }, [searchQuery, mediaType, audienceType, advancedFilters, setSearchParams]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleRowClick = (item: ItemShort) => {
    navigate(`/items/${item.id}`);
  };

  const formatAuthor = (author?: Author | null) => {
    if (!author) return '-';
    return `${author.firstname || ''} ${author.lastname || ''}`.trim() || '-';
  };

  const getStatusBadge = (status?: number | null) => {
    if (status === 0) return <Badge variant="success">{t('items.available')}</Badge>;
    if (status === 1) return <Badge variant="warning">{t('items.borrowed')}</Badge>;
    return <Badge>{t('items.unavailable')}</Badge>;
  };

  const getMediaTypeIcon = (mediaType?: MediaType) => {
    const iconClass = "h-5 w-5";
    const colorClass = "text-amber-600 dark:text-amber-400";
    
    switch (mediaType) {
      case 'b':
      case 'bc':
        return <BookOpen className={`${iconClass} ${colorClass}`} />;
      case 'p':
        return <Newspaper className={`${iconClass} ${colorClass}`} />;
      case 'v':
      case 'vt':
      case 'vd':
        return <Video className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case 'a':
      case 'am':
      case 'amt':
      case 'amc':
      case 'an':
        return <Music className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'c':
        return <Disc className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      case 'i':
        return <Image className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'm':
        return <FileText className={`${iconClass} text-indigo-600 dark:text-indigo-400`} />;
      default:
        return <BookOpen className={`${iconClass} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const getMediaTypeBgColor = (mediaType?: MediaType) => {
    switch (mediaType) {
      case 'b':
      case 'bc':
        return 'bg-amber-50 dark:bg-amber-900/30';
      case 'p':
        return 'bg-orange-50 dark:bg-orange-900/30';
      case 'v':
      case 'vt':
      case 'vd':
        return 'bg-red-50 dark:bg-red-900/30';
      case 'a':
      case 'am':
      case 'amt':
      case 'amc':
      case 'an':
        return 'bg-blue-50 dark:bg-blue-900/30';
      case 'c':
        return 'bg-purple-50 dark:bg-purple-900/30';
      case 'i':
        return 'bg-green-50 dark:bg-green-900/30';
      case 'm':
        return 'bg-indigo-50 dark:bg-indigo-900/30';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30';
    }
  };

  const columns = [
    {
      key: 'title',
      header: t('items.titleField'),
      render: (item: ItemShort) => (
        <div className="flex items-center gap-3">
          <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${getMediaTypeBgColor(item.media_type as MediaType)} flex items-center justify-center`}>
            {getMediaTypeIcon(item.media_type as MediaType)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {item.title || t('items.notSpecified')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {item.isbn}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      header: t('items.author'),
      render: (item: ItemShort) => (
        <span className="text-gray-600 dark:text-gray-300">
          {formatAuthor(item.author)}
        </span>
      ),
    },
    {
      key: 'specimens',
      header: t('items.specimens'),
      render: (item: ItemShort) => {
        const list = item.specimens ?? [];
        const total = list.length;
        const available = list.filter((s) => s.availability === 0).length;
        if (total === 0) return <span className="text-gray-500 dark:text-gray-400">-</span>;
        return (
          <span className="text-gray-600 dark:text-gray-300">
            {available}/{total}
          </span>
        );
      },
      className: 'hidden md:table-cell',
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
            {!showFilters && (
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                placeholder={t('items.searchPlaceholder')}
              />
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as MediaType | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('items.allPublicTypes')}</option>
              {PUBLIC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">
                {showFilters ? t('common.hide') : t('items.advancedSearch')}
              </span>
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
                value={advancedFilters.isbn}
                onChange={(e) =>
                  setAdvancedFilters({ ...advancedFilters, isbn: e.target.value })
                }
                placeholder={t('z3950.isbnPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setAdvancedFilters({ title: '', author: '', isbn: '' })}
              >
                {t('common.reset')}
              </Button>
              <Button leftIcon={<Search className="h-4 w-4" />}>
                {t('common.search')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Items list: fixed-height scroll area so header/filters stay static */}
      <Card padding="none" className="flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 flex justify-end">
          <span>{t('items.count', { count: totalItems })}</span>
        </div>
        {/* Fixed table header (Titre / Auteur / ...) */}
        <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div
          className="items-list-scroll overflow-auto max-h-[calc(100vh-18rem)]"
          aria-label={t('items.title')}
        >
          <Table
            columns={columns}
            data={items}
            keyExtractor={(item) => item.id}
            onRowClick={handleRowClick}
            isLoading={isItemsLoading}
            emptyMessage={t('items.noItems')}
            hideHeader
          />
          <div ref={loadMoreRef} className="h-4 flex-shrink-0" aria-hidden />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Create modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('items.add')}
        size="lg"
      >
        <CreateItemForm
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
          }}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}

interface CreateItemFormProps {
  onCreated: () => void;
  onClose: () => void;
}

function CreateItemForm({ onCreated, onClose }: CreateItemFormProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [confirmReplaceModal, setConfirmReplaceModal] = useState<{ existingId: string; message: string } | null>(null);
  const [confirmReplaceLoading, setConfirmReplaceLoading] = useState(false);
  const [confirmReplaceError, setConfirmReplaceError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    isbn: string;
    media_type: MediaType;
    publication_date: string;
  }>({
    title: '',
    isbn: '',
    media_type: 'b',
    publication_date: '',
  });

  // Z3950 search states
  const [z3950Servers, setZ3950Servers] = useState<Z3950Server[]>([]);
  const [isSearchingZ3950, setIsSearchingZ3950] = useState(false);
  const [z3950Message, setZ3950Message] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sources and specimens (optional when creating item)
  const [sources, setSources] = useState<Source[]>([]);
  const [specimens, setSpecimens] = useState<{ barcode: string; call_number: string; source_id: string }[]>([
    { barcode: '', call_number: '', source_id: '' },
  ]);

  const MEDIA_TYPES: MediaTypeOption[] = [
    { value: 'u', label: t('items.mediaType.unknown') },
    { value: 'b', label: t('items.mediaType.printedText') },
    { value: 'bc', label: t('items.mediaType.comics') },
    { value: 'p', label: t('items.mediaType.periodic') },
    { value: 'v', label: t('items.mediaType.video') },
    { value: 'vt', label: t('items.mediaType.videoTape') },
    { value: 'vd', label: t('items.mediaType.videoDvd') },
    { value: 'a', label: t('items.mediaType.audio') },
    { value: 'am', label: t('items.mediaType.audioMusic') },
    { value: 'amt', label: t('items.mediaType.audioMusicTape') },
    { value: 'amc', label: t('items.mediaType.audioMusicCd') },
    { value: 'an', label: t('items.mediaType.audioNonMusic') },
    { value: 'c', label: t('items.mediaType.cdRom') },
    { value: 'i', label: t('items.mediaType.images') },
    { value: 'm', label: t('items.mediaType.multimedia') },
  ];

  // Load Z39.50 servers and sources on mount
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const settings = await api.getSettings();
        const activeServers = (settings.z3950_servers || []).filter(s => s.is_active);
        setZ3950Servers(activeServers);
      } catch (error) {
        console.error('Error fetching Z39.50 servers:', error);
      }
    };
    const fetchSources = async () => {
      try {
        const list = await api.getSources(false);
        setSources(list);
        const defaultId = list.find((s) => s.default)?.id ?? list[0]?.id ?? '';
        setSpecimens((prev) =>
          prev.length === 1 && prev[0].source_id === '' && defaultId
            ? [{ ...prev[0], source_id: defaultId }]
            : prev
        );
      } catch (error) {
        console.error('Error fetching sources:', error);
      }
    };
    fetchServers();
    fetchSources();
  }, []);

  const handleZ3950Search = async () => {
    if (!formData.isbn.trim()) {
      setZ3950Message({ type: 'error', text: t('z3950.isbnRequired') });
      return;
    }

    if (z3950Servers.length === 0) {
      setZ3950Message({ type: 'error', text: t('z3950.noServers') });
      return;
    }

    setIsSearchingZ3950(true);
    setZ3950Message(null);

    try {
      // Use first active server
      const response = await api.searchZ3950({
        isbn: formData.isbn,
        server_id: z3950Servers[0].id,
        max_results: 1,
      });

      if (response.items && response.items.length > 0) {
        const item = response.items[0];
        // Prefill form with Z39.50 data
        setFormData({
          ...formData,
          title: item.title || formData.title,
          media_type: (item.media_type || formData.media_type) as MediaType,
          publication_date: item.date || formData.publication_date,
        });
        setZ3950Message({ type: 'success', text: t('z3950.dataFound') });
      } else {
        setZ3950Message({ type: 'error', text: t('z3950.noResults') });
      }
    } catch (error) {
      console.error('Error searching Z39.50:', error);
      setZ3950Message({ type: 'error', text: t('z3950.searchError') });
    } finally {
      setIsSearchingZ3950(false);
    }
  };

  const buildSpecimensPayload = (): { barcode?: string; call_number?: string; source_id: string }[] | undefined => {
    const filled = specimens.filter((s) => s.source_id.trim() !== '');
    if (filled.length === 0) return undefined;
    return filled.map((s) => ({
      barcode: s.barcode.trim() || undefined,
      call_number: s.call_number.trim() || undefined,
      source_id: s.source_id,
    }));
  };

  const handleAddSpecimen = () => {
    setSpecimens([...specimens, { barcode: '', call_number: '', source_id: sources.find((s) => s.default)?.id ?? sources[0]?.id ?? '' }]);
  };

  const handleRemoveSpecimen = (index: number) => {
    if (specimens.length <= 1) return;
    setSpecimens(specimens.filter((_, i) => i !== index));
  };

  const handleSpecimenChange = (index: number, field: 'barcode' | 'call_number' | 'source_id', value: string) => {
    const next = [...specimens];
    next[index] = { ...next[index], [field]: value };
    setSpecimens(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidCallNumber = specimens.find((s) => s.call_number.trim() !== '' && !validateCallNumber(s.call_number));
    if (invalidCallNumber) return;
    const specimenPayload = buildSpecimensPayload();
    if (specimenPayload?.some((s) => !s.source_id)) return;
    setIsLoading(true);
    try {
      const payload = { ...formData, ...(specimenPayload?.length ? { specimens: specimenPayload } : {}) };
      const created = await api.createItem(payload);
      setCreatedItemId(created.item.id ?? null);
      setImportReport(created.import_report);
      onCreated();
    } catch (error) {
      const confirm = getDuplicateConfirmationRequired(error);
      if (confirm) {
        setConfirmReplaceError(null);
        setConfirmReplaceModal({ existingId: confirm.existing_id, message: confirm.message });
      } else {
        console.error('Error creating item:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReplaceExisting = async () => {
    if (!confirmReplaceModal) return;
    const specimenPayload = buildSpecimensPayload();
    setConfirmReplaceLoading(true);
    setConfirmReplaceError(null);
    try {
      const payload = { ...formData, ...(specimenPayload?.length ? { specimens: specimenPayload } : {}) };
      const created = await api.createItem(payload, { confirmReplaceExistingId: confirmReplaceModal.existingId });
      setConfirmReplaceModal(null);
      setCreatedItemId(created.item.id ?? null);
      setImportReport(created.import_report);
      onCreated();
    } catch (err) {
      console.error('Error confirming replace existing item:', err);
      setConfirmReplaceError(t('errors.generic'));
    } finally {
      setConfirmReplaceLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {createdItemId ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('common.success')}
          </h3>
          {importReport && (
            <div className="mx-auto max-w-xl text-left mb-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
              <div className="text-sm font-medium text-green-900 dark:text-green-200">
                {importReport.message || importReport.action}
                {importReport.existing_id != null ? ` (ID: ${importReport.existing_id})` : ''}
              </div>
              {importReport.warnings?.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-green-800 dark:text-green-300 space-y-1">
                  {importReport.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('items.titleField')}
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('items.isbn')}
          </label>
          <div className="flex gap-2">
            <Input
              value={formData.isbn}
              onChange={(e) => {
                setFormData({ ...formData, isbn: e.target.value });
                setZ3950Message(null);
              }}
              placeholder={t('z3950.isbnPlaceholder')}
              className="flex-1"
            />
            {z3950Servers.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleZ3950Search}
                disabled={isSearchingZ3950 || !formData.isbn.trim()}
                title={t('z3950.searchButton')}
                className="flex-shrink-0"
              >
                {isSearchingZ3950 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('items.mediaTypeLabel')}
          </label>
          <select
            value={formData.media_type}
            onChange={(e) => setFormData({ ...formData, media_type: e.target.value as MediaType })}
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
      
      {/* Z39.50 search message */}
      {z3950Message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          z3950Message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {z3950Message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{z3950Message.text}</span>
        </div>
      )}
      <Input
        label={t('items.publicationDate')}
        value={formData.publication_date}
        onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
        placeholder="YYYY"
      />

      {/* Optional specimens: add one or more with source per specimen */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('items.specimensOptional')}
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddSpecimen} leftIcon={<Plus className="h-4 w-4" />}>
            {t('items.addSpecimen')}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('items.specimensOptionalHint')}</p>
        <div className="space-y-3">
          {specimens.map((specimen, index) => (
            <div key={index} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder={t('items.specimenBarcode')}
                  value={specimen.barcode}
                  onChange={(e) => handleSpecimenChange(index, 'barcode', e.target.value)}
                />
                <CallNumberField
                  value={specimen.call_number}
                  onChange={(v) => handleSpecimenChange(index, 'call_number', v)}
                  suggestedValue={buildSuggestedCallNumber({
                    categoryCode: 'GEN',
                    year: formData.publication_date,
                  })}
                  placeholder={t('items.callNumber')}
                  inputId={`create-specimen-call-${index}`}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('items.source')}</label>
                  <select
                    value={specimen.source_id}
                    onChange={(e) => handleSpecimenChange(index, 'source_id', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">{t('items.selectSource')}</option>
                    {sources.map((src) => (
                      <option key={src.id} value={src.id}>
                        {src.name || src.id}
                        {src.default ? ` (${t('importMarc.default')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {specimens.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSpecimen(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          {t('common.create')}
        </Button>
      </div>
        </form>
      )}

      <Modal
        isOpen={!!confirmReplaceModal}
        onClose={() => {
          if (confirmReplaceLoading) return;
          setConfirmReplaceModal(null);
          setConfirmReplaceError(null);
        }}
        title={t('items.confirmReplaceTitle')}
        size="lg"
      >
        {confirmReplaceModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{confirmReplaceModal.message}</p>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">
                {t('items.confirmReplaceExistingId', { id: confirmReplaceModal.existingId })}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('items.confirmReplaceExplanation')}
              </div>
            </div>
            {confirmReplaceError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {confirmReplaceError}
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirmReplaceLoading) return;
                  setConfirmReplaceModal(null);
                  setConfirmReplaceError(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirmReplaceExisting} isLoading={confirmReplaceLoading}>
                {t('items.confirmReplaceConfirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
