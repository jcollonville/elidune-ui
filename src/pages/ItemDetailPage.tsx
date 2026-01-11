import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  User,
  Hash,
  Building,
  MapPin,
  FileText,
  Tag,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, Button, Badge, Modal, Input } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { canManageItems } from '@/types';
import api from '@/services/api';
import type { Item, Specimen, Author } from '@/types';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddSpecimenModal, setShowAddSpecimenModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      try {
        const data = await api.getItem(parseInt(id));
        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
        navigate('/items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!item) return;
    try {
      await api.deleteItem(item.id);
      navigate('/items');
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return 'Non renseigné';
    return authors.map((a) => `${a.firstname || ''} ${a.lastname || ''}`.trim()).join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Document non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/items')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {item.title1 || 'Sans titre'}
            </h1>
            {item.title2 && (
              <p className="text-gray-600 dark:text-gray-400">{item.title2}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge>{item.media_type || 'Document'}</Badge>
              {item.is_valid === 0 && <Badge variant="warning">Non validé</Badge>}
            </div>
          </div>
        </div>

        {canManageItems(user?.account_type) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(true)} leftIcon={<Edit className="h-4 w-4" />}>
              Modifier
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)} leftIcon={<Trash2 className="h-4 w-4" />}>
              Supprimer
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Informations générales" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Hash} label="Identification" value={item.identification} />
              <InfoRow icon={User} label="Auteur(s) principal" value={formatAuthors(item.authors1)} />
              <InfoRow icon={User} label="Auteur(s) secondaire" value={formatAuthors(item.authors2)} />
              <InfoRow icon={Calendar} label="Date de publication" value={item.publication_date} />
              <InfoRow icon={Building} label="Éditeur" value={item.edition?.name} />
              <InfoRow icon={MapPin} label="Lieu d'édition" value={item.edition?.place} />
            </div>
          </Card>

          {item.abstract_ && (
            <Card>
              <CardHeader title="Résumé" />
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {item.abstract_}
              </p>
            </Card>
          )}

          {(item.keywords || item.subject) && (
            <Card>
              <CardHeader title="Mots-clés et sujet" />
              <div className="space-y-3">
                {item.keywords && (
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 mt-1 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-300">{item.keywords}</p>
                  </div>
                )}
                {item.subject && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-300">{item.subject}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Specimens */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Exemplaires"
              subtitle={`${item.specimens?.length || 0} exemplaire(s)`}
              action={
                canManageItems(user?.account_type) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddSpecimenModal(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Ajouter
                  </Button>
                )
              }
            />
            {item.specimens && item.specimens.length > 0 ? (
              <div className="space-y-3">
                {item.specimens.map((specimen) => (
                  <SpecimenCard key={specimen.id} specimen={specimen} />
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                Aucun exemplaire enregistré
              </p>
            )}
          </Card>

          {item.collection && (
            <Card>
              <CardHeader title="Collection" />
              <p className="font-medium text-gray-900 dark:text-white">
                {item.collection.title1}
              </p>
              {item.collection.issn && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ISSN: {item.collection.issn}
                </p>
              )}
            </Card>
          )}

          {item.serie && (
            <Card>
              <CardHeader title="Série" />
              <p className="font-medium text-gray-900 dark:text-white">
                {item.serie.name}
              </p>
              {item.serie.volume_number && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Volume {item.serie.volume_number}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmer la suppression"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Êtes-vous sûr de vouloir supprimer "{item.title1}" ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Supprimer
          </Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le document"
        size="lg"
      >
        <EditItemForm
          item={item}
          onSuccess={(updatedItem) => {
            setItem(updatedItem);
            setShowEditModal(false);
          }}
        />
      </Modal>

      {/* Add specimen modal */}
      <Modal
        isOpen={showAddSpecimenModal}
        onClose={() => setShowAddSpecimenModal(false)}
        title="Ajouter un exemplaire"
      >
        <AddSpecimenForm
          itemId={item.id}
          onSuccess={() => {
            setShowAddSpecimenModal(false);
            // Refresh item data
            api.getItem(item.id).then(setItem);
          }}
        />
      </Modal>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-gray-900 dark:text-white">{value || 'Non renseigné'}</p>
      </div>
    </div>
  );
}

function SpecimenCard({ specimen }: { specimen: Specimen }) {
  const getAvailabilityBadge = (availability?: number) => {
    if (availability === 0) return <Badge variant="success">Disponible</Badge>;
    if (availability === 1) return <Badge variant="warning">Emprunté</Badge>;
    return <Badge>Indisponible</Badge>;
  };

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900 dark:text-white">
          {specimen.identification || 'Sans code'}
        </p>
        {getAvailabilityBadge(specimen.availability)}
      </div>
      {specimen.cote && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cote: {specimen.cote}</p>
      )}
      {specimen.source_name && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Source: {specimen.source_name}</p>
      )}
    </div>
  );
}

interface EditItemFormProps {
  item: Item;
  onSuccess: (item: Item) => void;
}

function EditItemForm({ item, onSuccess }: EditItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title1: item.title1 || '',
    title2: item.title2 || '',
    identification: item.identification || '',
    publication_date: item.publication_date || '',
    abstract_: item.abstract_ || '',
    keywords: item.keywords || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updated = await api.updateItem(item.id, formData);
      onSuccess(updated);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Titre principal"
        value={formData.title1}
        onChange={(e) => setFormData({ ...formData, title1: e.target.value })}
        required
      />
      <Input
        label="Sous-titre"
        value={formData.title2}
        onChange={(e) => setFormData({ ...formData, title2: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="ISBN / Code-barre"
          value={formData.identification}
          onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
        />
        <Input
          label="Date de publication"
          value={formData.publication_date}
          onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Résumé
        </label>
        <textarea
          value={formData.abstract_}
          onChange={(e) => setFormData({ ...formData, abstract_: e.target.value })}
          rows={4}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>
      <Input
        label="Mots-clés"
        value={formData.keywords}
        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
        placeholder="Séparés par des virgules"
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

interface AddSpecimenFormProps {
  itemId: number;
  onSuccess: () => void;
}

function AddSpecimenForm({ itemId, onSuccess }: AddSpecimenFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identification: '',
    cote: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Note: This would need a dedicated endpoint in the API
      await api.updateItem(itemId, {
        specimens: [{ ...formData, id: 0, status: 0, availability: 0 }],
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding specimen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Code-barre"
        value={formData.identification}
        onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
        required
      />
      <Input
        label="Cote"
        value={formData.cote}
        onChange={(e) => setFormData({ ...formData, cote: e.target.value })}
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

