import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  BookMarked,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Card, CardHeader, Button, Badge, Modal, Input, Table } from '@/components/common';
import api from '@/services/api';
import type { User as UserType, Loan } from '@/types';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserType | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [userData, loansData] = await Promise.all([
          api.getUser(parseInt(id)),
          api.getUserLoans(parseInt(id)),
        ]);
        setUser(userData);
        setLoans(loansData);
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await api.deleteUser(user.id);
      navigate('/users');
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleReturnLoan = async (loanId: number) => {
    try {
      await api.returnLoan(loanId);
      // Refresh loans
      if (user) {
        const loansData = await api.getUserLoans(user.id);
        setLoans(loansData);
      }
    } catch (error) {
      console.error('Error returning loan:', error);
    }
  };

  const handleRenewLoan = async (loanId: number) => {
    try {
      await api.renewLoan(loanId);
      // Refresh loans
      if (user) {
        const loansData = await api.getUserLoans(user.id);
        setLoans(loansData);
      }
    } catch (error) {
      console.error('Error renewing loan:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Usager non trouvé</p>
      </div>
    );
  }

  const overdueLoans = loans.filter((l) => l.is_overdue);

  const loanColumns = [
    {
      key: 'title',
      header: 'Document',
      render: (loan: Loan) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {loan.item.title || 'Sans titre'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loan.specimen_identification}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date emprunt',
      render: (loan: Loan) =>
        new Date(loan.start_date * 1000).toLocaleDateString('fr-FR'),
    },
    {
      key: 'issue_date',
      header: 'Échéance',
      render: (loan: Loan) => (
        <div className="flex items-center gap-2">
          <span>{new Date(loan.issue_date * 1000).toLocaleDateString('fr-FR')}</span>
          {loan.is_overdue && <Badge variant="danger">Retard</Badge>}
        </div>
      ),
    },
    {
      key: 'renews',
      header: 'Prolongations',
      render: (loan: Loan) => loan.nb_renews,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (loan: Loan) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleRenewLoan(loan.id);
            }}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Prolonger
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleReturnLoan(loan.id);
            }}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Retour
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {user.firstname?.[0] || '?'}{user.lastname?.[0] || ''}
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {user.firstname} {user.lastname}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{user.account_type}</Badge>
              {overdueLoans.length > 0 && (
                <Badge variant="danger">{overdueLoans.length} retard{overdueLoans.length > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBorrowModal(true)} leftIcon={<BookMarked className="h-4 w-4" />}>
            Emprunter
          </Button>
          <Button variant="secondary" onClick={() => setShowEditModal(true)} leftIcon={<Edit className="h-4 w-4" />}>
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)} leftIcon={<Trash2 className="h-4 w-4" />}>
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User info */}
        <Card>
          <CardHeader title="Informations" />
          <div className="space-y-4">
            <InfoRow icon={User} label="Identifiant" value={user.username} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Téléphone" value={user.phone} />
            <InfoRow icon={Calendar} label="Code-barre" value={user.barcode} />
          </div>
        </Card>

        {/* Loans */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
              <CardHeader
                title="Emprunts en cours"
                subtitle={`${loans.length} emprunt${loans.length > 1 ? 's' : ''}`}
              />
            </div>
            <Table
              columns={loanColumns}
              data={loans}
              keyExtractor={(loan) => loan.id}
              emptyMessage="Aucun emprunt en cours"
            />
          </Card>
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
          Êtes-vous sûr de vouloir supprimer le compte de {user.firstname} {user.lastname} ?
          {loans.length > 0 && (
            <span className="block mt-2 text-amber-600 dark:text-amber-400">
              ⚠️ Cet usager a encore {loans.length} emprunt(s) en cours.
            </span>
          )}
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
        title="Modifier l'usager"
        size="lg"
      >
        <EditUserForm
          user={user}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            setShowEditModal(false);
          }}
        />
      </Modal>

      {/* Borrow modal */}
      <Modal
        isOpen={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        title="Nouvel emprunt"
      >
        <BorrowForm
          userId={user.id}
          onSuccess={() => {
            setShowBorrowModal(false);
            // Refresh loans
            api.getUserLoans(user.id).then(setLoans);
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
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-gray-900 dark:text-white">{value || 'Non renseigné'}</p>
      </div>
    </div>
  );
}

interface EditUserFormProps {
  user: UserType;
  onSuccess: (user: UserType) => void;
}

function EditUserForm({ user, onSuccess }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    email: user.email || '',
    phone: user.phone || '',
    barcode: user.barcode || '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete (updateData as Record<string, unknown>).password;
      }
      const updated = await api.updateUser(user.id, updateData);
      onSuccess(updated);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          value={formData.firstname}
          onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
        />
        <Input
          label="Nom"
          value={formData.lastname}
          onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <Input
          label="Téléphone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Code-barre"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
        />
        <Input
          label="Nouveau mot de passe"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Laisser vide pour ne pas changer"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

interface BorrowFormProps {
  userId: number;
  onSuccess: () => void;
}

function BorrowForm({ userId, onSuccess }: BorrowFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [specimenCode, setSpecimenCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.createLoan({
        user_id: userId,
        specimen_identification: specimenCode,
      });
      onSuccess();
    } catch (err) {
      setError('Impossible de créer l\'emprunt. Vérifiez le code-barre.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Code-barre de l'exemplaire"
        value={specimenCode}
        onChange={(e) => setSpecimenCode(e.target.value)}
        placeholder="Scanner ou saisir le code-barre"
        autoFocus
        required
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Emprunter
        </Button>
      </div>
    </form>
  );
}


