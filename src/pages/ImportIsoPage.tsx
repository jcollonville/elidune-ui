import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  FileText,
  BookOpen,
  AlertCircle,
  Loader2,
  ScanLine,
  CheckCircle,
  Trash2,
  Download,
  X,
  Settings2,
} from 'lucide-react';
import { Card, Button, Badge, Table, Input } from '@/components/common';
import api from '@/services/api';
import type { Author, MediaType } from '@/types';

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

// Types
type FileFormat = 'iso2709' | 'marcxml';
type Encoding = 'utf-8' | 'iso-8859-1' | 'windows-1252' | 'iso-8859-15';

interface ParsedRecord {
  id: string;
  title1?: string;
  title2?: string;
  identification?: string;
  authors1?: Author[];
  authors2?: Author[];
  publication_date?: string;
  edition_name?: string;
  edition_place?: string;
  abstract_?: string;
  keywords?: string;
  subject?: string;
  media_type?: MediaType;
  raw_fields: Map<string, string[]>;
  status: 'pending' | 'importing' | 'imported' | 'error';
  error?: string;
  importedId?: number;
}

// Helper to get subfield from MARC field
function getSubfield(fieldData: string, code: string, delimiter = '\x1F'): string | undefined {
  const parts = fieldData.split(delimiter);
  for (const part of parts) {
    if (part.length > 0 && part[0] === code) {
      return part.substring(1).trim();
    }
  }
  return undefined;
}

// Parse author from MARC field
function parseAuthor(fieldData: string, delimiter = '\x1F'): Author {
  const lastname = getSubfield(fieldData, 'a', delimiter);
  const firstname = getSubfield(fieldData, 'b', delimiter);
  const func = getSubfield(fieldData, '4', delimiter) || getSubfield(fieldData, 'e', delimiter);
  return {
    id: 0,
    lastname: lastname?.replace(/,\s*$/, ''),
    firstname,
    function: func,
  };
}

// Build record from raw MARC fields
function buildRecordFromFields(
  rawFields: Map<string, string[]>,
  leader: string,
  index: number
): ParsedRecord {
  const record: ParsedRecord = {
    id: `record-${index}-${Date.now()}`,
    raw_fields: rawFields,
    status: 'pending',
  };

  // Title (200$a, 200$e for UNIMARC, 245$a, 245$b for MARC21)
  const field200 = rawFields.get('200')?.[0];
  const field245 = rawFields.get('245')?.[0];
  if (field200) {
    record.title1 = getSubfield(field200, 'a');
    record.title2 = getSubfield(field200, 'e');
  } else if (field245) {
    record.title1 = getSubfield(field245, 'a')?.replace(/\s*[/:;]\s*$/, '');
    record.title2 = getSubfield(field245, 'b')?.replace(/\s*[/:;]\s*$/, '');
  }

  // ISBN (010$a for UNIMARC, 020$a for MARC21)
  const field010 = rawFields.get('010')?.[0];
  const field020 = rawFields.get('020')?.[0];
  if (field010) {
    record.identification = getSubfield(field010, 'a');
  } else if (field020) {
    record.identification = getSubfield(field020, 'a')?.split(' ')[0];
  }

  // Authors
  const authors1: Author[] = [];
  const authors2: Author[] = [];

  // Main author (700 for UNIMARC, 100 for MARC21)
  const field700 = rawFields.get('700')?.[0];
  const field100 = rawFields.get('100')?.[0];
  if (field700) {
    authors1.push(parseAuthor(field700));
  } else if (field100) {
    authors1.push(parseAuthor(field100));
  }

  // Secondary authors (701, 702 for UNIMARC)
  for (const f of rawFields.get('701') || []) {
    authors2.push(parseAuthor(f));
  }
  for (const f of rawFields.get('702') || []) {
    authors2.push(parseAuthor(f));
  }

  if (authors1.length > 0) record.authors1 = authors1;
  if (authors2.length > 0) record.authors2 = authors2;

  // Publication info (210 for UNIMARC, 260/264 for MARC21)
  const field210 = rawFields.get('210')?.[0];
  const field260 = rawFields.get('260')?.[0];
  const field264 = rawFields.get('264')?.[0];
  if (field210) {
    record.publication_date = getSubfield(field210, 'd')?.replace(/[^\d]/g, '').substring(0, 4);
    record.edition_name = getSubfield(field210, 'c');
    record.edition_place = getSubfield(field210, 'a');
  } else if (field260) {
    record.publication_date = getSubfield(field260, 'c')?.replace(/[^\d]/g, '').substring(0, 4);
    record.edition_name = getSubfield(field260, 'b')?.replace(/[,.:]\s*$/, '');
    record.edition_place = getSubfield(field260, 'a')?.replace(/\s*:\s*$/, '');
  } else if (field264) {
    record.publication_date = getSubfield(field264, 'c')?.replace(/[^\d]/g, '').substring(0, 4);
    record.edition_name = getSubfield(field264, 'b')?.replace(/[,.:]\s*$/, '');
    record.edition_place = getSubfield(field264, 'a')?.replace(/\s*:\s*$/, '');
  }

  // Abstract (330 for UNIMARC, 520 for MARC21)
  const field330 = rawFields.get('330')?.[0];
  const field520 = rawFields.get('520')?.[0];
  if (field330) {
    record.abstract_ = getSubfield(field330, 'a');
  } else if (field520) {
    record.abstract_ = getSubfield(field520, 'a');
  }

  // Keywords (606, 610 for UNIMARC, 650 for MARC21)
  const keywords: string[] = [];
  for (const f of rawFields.get('606') || []) {
    const kw = getSubfield(f, 'a');
    if (kw) keywords.push(kw);
  }
  for (const f of rawFields.get('610') || []) {
    const kw = getSubfield(f, 'a');
    if (kw) keywords.push(kw);
  }
  for (const f of rawFields.get('650') || []) {
    const kw = getSubfield(f, 'a');
    if (kw) keywords.push(kw);
  }
  if (keywords.length > 0) record.keywords = keywords.join(', ');

  // Media type from leader position 6
  // Map MARC leader types to server media types
  if (leader && leader.length > 6) {
    const leaderType = leader[6];
    switch (leaderType) {
      case 'a': // Text (monographic)
      case 't': // Text (manuscript)
        record.media_type = 'b'; // PrintedText
        break;
      case 'g': // Projected medium
        record.media_type = 'v'; // Video
        break;
      case 'j': // Musical sound recording
      case 'i': // Nonmusical sound recording
        record.media_type = 'a'; // Audio
        break;
      case 's': // Serial/Periodical
        record.media_type = 'p'; // Periodic
        break;
      case 'm': // Computer file
        record.media_type = 'c'; // CdRom
        break;
      case 'k': // Two-dimensional nonprojectable graphic
      case 'r': // Three-dimensional artifact
        record.media_type = 'i'; // Images
        break;
      default:
        record.media_type = 'u'; // Unknown
    }
  } else {
    record.media_type = 'u'; // Unknown
  }

  return record;
}

// ISO 2709 Parser
function parseISO2709(content: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const RECORD_TERMINATOR = '\x1D';
  const FIELD_TERMINATOR = '\x1E';

  const rawRecords = content.split(RECORD_TERMINATOR).filter(r => r.length > 0);

  for (let i = 0; i < rawRecords.length; i++) {
    const rawRecord = rawRecords[i];
    if (rawRecord.length < 24) continue;

    try {
      // Parse leader
      const leader = rawRecord.substring(0, 24);
      const baseAddress = parseInt(leader.substring(12, 17));

      // Parse directory
      const directoryEnd = rawRecord.indexOf(FIELD_TERMINATOR);
      const directory = rawRecord.substring(24, directoryEnd);

      // Parse fields
      const fieldsData = rawRecord.substring(baseAddress);
      const rawFields = new Map<string, string[]>();

      for (let j = 0; j < directory.length; j += 12) {
        const tag = directory.substring(j, j + 3);
        const fieldLength = parseInt(directory.substring(j + 3, j + 7));
        const startPos = parseInt(directory.substring(j + 7, j + 12));

        if (!isNaN(fieldLength) && !isNaN(startPos)) {
          const fieldData = fieldsData.substring(startPos, startPos + fieldLength - 1);
          const existing = rawFields.get(tag) || [];
          existing.push(fieldData);
          rawFields.set(tag, existing);
        }
      }

      const record = buildRecordFromFields(rawFields, leader, i);
      if (record.title1) {
        records.push(record);
      }
    } catch (e) {
      console.error('Error parsing ISO 2709 record', e);
    }
  }

  return records;
}

// MARCXML Parser
function parseMARCXML(content: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parse error:', parseError.textContent);
      return [];
    }

    // Find all record elements (handle different namespaces)
    const recordElements = doc.querySelectorAll('record');
    
    for (let i = 0; i < recordElements.length; i++) {
      const recordEl = recordElements[i];
      
      try {
        // Get leader
        const leaderEl = recordEl.querySelector('leader');
        const leader = leaderEl?.textContent || '';

        // Parse control fields and data fields
        const rawFields = new Map<string, string[]>();

        // Control fields (001-009)
        const controlFields = recordEl.querySelectorAll('controlfield');
        controlFields.forEach(cf => {
          const tag = cf.getAttribute('tag');
          if (tag) {
            const existing = rawFields.get(tag) || [];
            existing.push(cf.textContent || '');
            rawFields.set(tag, existing);
          }
        });

        // Data fields (010+)
        const dataFields = recordEl.querySelectorAll('datafield');
        dataFields.forEach(df => {
          const tag = df.getAttribute('tag');
          if (tag) {
            // Build field content with subfield delimiter
            let fieldContent = df.getAttribute('ind1') || ' ';
            fieldContent += df.getAttribute('ind2') || ' ';
            
            const subfields = df.querySelectorAll('subfield');
            subfields.forEach(sf => {
              const code = sf.getAttribute('code');
              if (code) {
                fieldContent += '\x1F' + code + (sf.textContent || '');
              }
            });

            const existing = rawFields.get(tag) || [];
            existing.push(fieldContent);
            rawFields.set(tag, existing);
          }
        });

        const record = buildRecordFromFields(rawFields, leader, i);
        if (record.title1) {
          records.push(record);
        }
      } catch (e) {
        console.error('Error parsing MARCXML record', e);
      }
    }
  } catch (e) {
    console.error('Error parsing MARCXML file', e);
  }

  return records;
}

export default function ImportIsoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const ENCODING_OPTIONS: { value: Encoding; label: string }[] = [
    { value: 'utf-8', label: t('importMarc.encodings.utf8') },
    { value: 'iso-8859-1', label: t('importMarc.encodings.iso88591') },
    { value: 'iso-8859-15', label: t('importMarc.encodings.iso885915') },
    { value: 'windows-1252', label: t('importMarc.encodings.windows1252') },
  ];

  const FORMAT_OPTIONS: { value: FileFormat; label: string; extensions: string }[] = [
    { value: 'iso2709', label: t('importMarc.formats.iso2709'), extensions: '.iso, .mrc, .marc' },
    { value: 'marcxml', label: t('importMarc.formats.marcxml'), extensions: '.xml, .marcxml' },
  ];

  // Options state
  const [fileFormat, setFileFormat] = useState<FileFormat>('iso2709');
  const [encoding, setEncoding] = useState<Encoding>('utf-8');
  const [showOptions, setShowOptions] = useState(false);

  // File state
  const [fileName, setFileName] = useState<string>('');
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Scan mode state
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');

  const parseFile = useCallback(async (file: File, format: FileFormat, enc: Encoding) => {
    // Read file with specified encoding
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder(enc);
    const content = decoder.decode(arrayBuffer);

    // Parse based on format
    if (format === 'marcxml') {
      return parseMARCXML(content);
    } else {
      return parseISO2709(content);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setParseError('');
    setFileName(file.name);

    try {
      const parsed = await parseFile(file, fileFormat, encoding);

      if (parsed.length === 0) {
        setParseError(t('importMarc.noRecordsFound', { 
          format: FORMAT_OPTIONS.find(f => f.value === fileFormat)?.label,
          encoding 
        }));
      } else {
        setRecords(parsed);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setParseError(t('importMarc.readError'));
    } finally {
      setIsLoading(false);
    }
  }, [fileFormat, encoding, parseFile, t, FORMAT_OPTIONS]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  const handleImportAll = async () => {
    const pendingRecords = records.filter(r => r.status === 'pending');
    if (pendingRecords.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: pendingRecords.length });

    for (let i = 0; i < pendingRecords.length; i++) {
      const record = pendingRecords[i];
      await importRecord(record);
      setImportProgress({ current: i + 1, total: pendingRecords.length });
    }

    setIsImporting(false);
  };

  const importRecord = async (record: ParsedRecord) => {
    setRecords(prev => prev.map(r =>
      r.id === record.id ? { ...r, status: 'importing' as const } : r
    ));

    try {
      const item = await api.createItem({
        title1: record.title1,
        title2: record.title2,
        identification: record.identification,
        authors1: record.authors1,
        authors2: record.authors2,
        publication_date: record.publication_date,
        abstract_: record.abstract_,
        keywords: record.keywords,
        media_type: record.media_type,
        edition: record.edition_name ? {
          id: 0,
          name: record.edition_name,
          place: record.edition_place,
        } : undefined,
      });

      setRecords(prev => prev.map(r =>
        r.id === record.id ? { ...r, status: 'imported' as const, importedId: item.id } : r
      ));
    } catch (error) {
      console.error('Error importing record:', error);
      setRecords(prev => prev.map(r =>
        r.id === record.id ? { ...r, status: 'error' as const, error: t('common.error') } : r
      ));
    }
  };

  const handleStartScanMode = () => {
    setScanMode(true);
    setScanInput('');
    setScanError('');
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const isbn = scanInput.trim();
    setScanError('');

    const matchingRecord = records.find(r =>
      r.status === 'pending' && r.identification === isbn
    );

    if (!matchingRecord) {
      setScanError(t('importMarc.isbnNotFound', { isbn }));
      setScanInput('');
      scanInputRef.current?.focus();
      return;
    }

    await importRecord(matchingRecord);
    setScanInput('');
    scanInputRef.current?.focus();

    const remaining = records.filter(r => r.status === 'pending').length - 1;
    if (remaining === 0) {
      setScanMode(false);
    }
  };

  const handleRemoveRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleClear = () => {
    setRecords([]);
    setFileName('');
    setParseError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return '-';
    return authors
      .map((a) => `${a.firstname || ''} ${a.lastname || ''}`.trim())
      .filter(Boolean)
      .join(', ');
  };

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const importedCount = records.filter(r => r.status === 'imported').length;
  const errorCount = records.filter(r => r.status === 'error').length;

  const getAcceptedExtensions = () => {
    const format = FORMAT_OPTIONS.find(f => f.value === fileFormat);
    return format?.extensions.split(', ').join(',') || '*';
  };

  const columns = [
    {
      key: 'status',
      header: '',
      render: (record: ParsedRecord) => {
        switch (record.status) {
          case 'imported':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
          case 'importing':
            return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
          case 'error':
            return (
              <span title={record.error}>
                <AlertCircle className="h-5 w-5 text-red-500" />
              </span>
            );
          default:
            return <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
        }
      },
      className: 'w-12',
    },
    {
      key: 'title',
      header: t('items.titleField'),
      render: (record: ParsedRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {record.title1 || t('items.notSpecified')}
            </p>
            {record.title2 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {record.title2}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'isbn',
      header: t('items.isbn'),
      render: (record: ParsedRecord) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {record.identification || '-'}
        </span>
      ),
    },
    {
      key: 'authors',
      header: t('items.authors'),
      render: (record: ParsedRecord) => (
        <span className="text-gray-600 dark:text-gray-300 truncate">
          {formatAuthors(record.authors1)}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'date',
      header: t('common.date'),
      render: (record: ParsedRecord) => record.publication_date || '-',
      className: 'hidden md:table-cell',
    },
    {
      key: 'type',
      header: t('common.type'),
      render: (record: ParsedRecord) => (
        <Badge>
          {record.media_type 
            ? t(`items.mediaType.${getMediaTypeTranslationKey(record.media_type)}`)
            : t('items.mediaType.unknown')
          }
        </Badge>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'actions',
      header: '',
      render: (record: ParsedRecord) => (
        record.status === 'pending' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveRecord(record.id);
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : record.status === 'imported' && record.importedId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/items/${record.importedId}`);
            }}
          >
            {t('common.view')}
          </Button>
        ) : null
      ),
      className: 'w-20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Upload className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          {t('importMarc.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('importMarc.subtitle')}
        </p>
      </div>

      {/* File upload area */}
      {records.length === 0 && (
        <Card>
          {/* Options panel */}
          <div className="mb-4">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <Settings2 className="h-4 w-4" />
              {t('importMarc.importOptions')}
              <span className={`transition-transform ${showOptions ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showOptions && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Format selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('importMarc.fileFormat')}
                    </label>
                    <select
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value as FileFormat)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {FORMAT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.extensions})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Encoding selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('importMarc.encoding')}
                    </label>
                    <select
                      value={encoding}
                      onChange={(e) => setEncoding(e.target.value as Encoding)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {ENCODING_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  💡 {t('importMarc.encodingHint')}
                </p>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptedExtensions()}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
                <p className="text-gray-600 dark:text-gray-300">{t('importMarc.analyzing')}</p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                  <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('importMarc.dropFile')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {t('importMarc.orClickToBrowse')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <Badge variant="default">
                    {FORMAT_OPTIONS.find(f => f.value === fileFormat)?.label}
                  </Badge>
                  <Badge variant="default">
                    {ENCODING_OPTIONS.find(e => e.value === encoding)?.label}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {parseError && (
            <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              {parseError}
            </div>
          )}
        </Card>
      )}

      {/* Records list */}
      {records.length > 0 && (
        <>
          {/* Stats and actions */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{fileName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('importMarc.documentsCount', { count: records.length })}
                  </span>
                  {importedCount > 0 && (
                    <Badge variant="success">{t('importMarc.imported', { count: importedCount })}</Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="danger">{t('importMarc.errors', { count: errorCount })}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleClear}>
                  {t('common.clear')}
                </Button>
                {pendingCount > 0 && !scanMode && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={handleStartScanMode}
                      leftIcon={<ScanLine className="h-4 w-4" />}
                    >
                      {t('importMarc.importWithScan')}
                    </Button>
                    <Button
                      onClick={handleImportAll}
                      isLoading={isImporting}
                      leftIcon={<Download className="h-4 w-4" />}
                    >
                      {t('importMarc.importAll', { count: pendingCount })}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Import progress */}
            {isImporting && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{t('importMarc.importProgress')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Scan mode */}
          {scanMode && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ScanLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('importMarc.scanMode')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('importMarc.scanModeHint')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setScanMode(false)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleScanSubmit} className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder={t('importMarc.scanPlaceholder')}
                    autoFocus
                  />
                </div>
                <Button type="submit">
                  {t('importMarc.validate')}
                </Button>
              </form>

              {scanError && (
                <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {scanError}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('importMarc.remainingToScan', { count: pendingCount })}
                </p>
              </div>
            </Card>
          )}

          {/* Table */}
          <Card padding="none">
            <Table
              columns={columns}
              data={records}
              keyExtractor={(record) => record.id}
              emptyMessage={t('items.noItems')}
            />
          </Card>
        </>
      )}
    </div>
  );
}
