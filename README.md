# Elidune UI

Interface utilisateur React pour le système de gestion de bibliothèque Elidune.

## 🚀 Fonctionnalités

### Pour tous les utilisateurs
- 📚 **Catalogue** : Recherche et consultation du catalogue de la bibliothèque
- 📖 **Mes emprunts** : Visualisation des emprunts en cours et historique
- 🔄 **Prolongations** : Prolongation des emprunts en ligne
- 🌗 **Thème adaptatif** : Mode sombre/clair automatique selon les préférences système

### Pour les bibliothécaires (Librarian)
- 👥 **Gestion des usagers** : Création, modification et suppression de comptes
- 📊 **Statistiques** : Tableau de bord avec statistiques d'activité
- 📤 **Prêts** : Enregistrement des emprunts et retours

### Pour les administrateurs
- ⚙️ **Paramètres** : Configuration des règles de prêt par type de document
- 🌐 **Serveurs Z39.50** : Configuration des catalogues distants

## 📦 Prérequis

- Node.js 18+
- npm 9+ ou yarn 1.22+
- Backend Elidune Server (API REST)

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd elidune-ui
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration

Créer un fichier `.env` à la racine du projet :

```env
VITE_API_URL=http://localhost:8080
```

## 🚦 Lancement

### Mode développement

```bash
npm run dev
```

L'application sera accessible à l'adresse http://localhost:3000

### Build de production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

### Prévisualisation de la production

```bash
npm run preview
```

## 🧪 Tests

### Lancer les tests unitaires

```bash
npm run test
```

### Lancer les tests avec couverture

```bash
npm run test:coverage
```

### Lancer les tests E2E

```bash
npm run test:e2e
```

## 📁 Structure du projet

```
elidune-ui/
├── public/                 # Fichiers statiques
├── src/
│   ├── components/         # Composants React réutilisables
│   │   └── common/         # Composants UI génériques
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Layout.tsx
│   │       ├── Modal.tsx
│   │       ├── Pagination.tsx
│   │       ├── SearchInput.tsx
│   │       └── Table.tsx
│   ├── contexts/           # Contextes React
│   │   ├── AuthContext.tsx # Gestion de l'authentification
│   │   └── ThemeContext.tsx# Gestion du thème
│   ├── hooks/              # Hooks personnalisés
│   ├── pages/              # Pages de l'application
│   │   ├── HomePage.tsx
│   │   ├── ItemDetailPage.tsx
│   │   ├── ItemsPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MyLoansPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── StatsPage.tsx
│   │   ├── UserDetailPage.tsx
│   │   └── UsersPage.tsx
│   ├── services/           # Services API
│   │   └── api.ts
│   ├── types/              # Types TypeScript
│   │   └── index.ts
│   ├── utils/              # Utilitaires
│   ├── App.tsx             # Composant racine
│   ├── index.css           # Styles globaux
│   └── main.tsx            # Point d'entrée
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Personnalisation

### Thème

Le thème utilise Tailwind CSS avec les modes clair et sombre. Les couleurs principales peuvent être modifiées dans `src/index.css` :

```css
:root {
  --color-primary: #6366f1;      /* Indigo */
  --color-primary-dark: #4f46e5;
  --color-accent: #f59e0b;       /* Amber */
  --color-success: #10b981;      /* Emerald */
  --color-danger: #ef4444;       /* Red */
  --color-warning: #f59e0b;      /* Amber */
}
```

### Mode thème

L'application détecte automatiquement les préférences système, mais l'utilisateur peut forcer un thème via le sélecteur dans la barre latérale :
- **Clair** : Thème lumineux
- **Sombre** : Thème sombre
- **Système** : Suit les préférences du système

## 📱 Responsive Design

L'interface est entièrement responsive et s'adapte aux différentes tailles d'écran :
- **Mobile** (< 640px) : Navigation par menu hamburger, layout en colonnes
- **Tablette** (640px - 1024px) : Layout adaptatif
- **Desktop** (> 1024px) : Sidebar fixe, layout multi-colonnes

## 🔐 Authentification

L'authentification utilise des tokens JWT stockés dans le localStorage. Les routes sont protégées selon le type de compte :

| Type de compte | Accès |
|---------------|-------|
| Guest | Lecture seule du catalogue |
| Reader | Catalogue + Mes emprunts |
| Librarian | + Gestion usagers + Stats |
| Administrator | + Paramètres système |

## 🔧 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run lint:fix` | Corrige automatiquement les erreurs ESLint |
| `npm run type-check` | Vérifie les types TypeScript |

## 🌐 Proxy API

En développement, les requêtes vers `/api` sont automatiquement redirigées vers le backend configuré dans `vite.config.ts` :

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}
```

## 📖 Technologies utilisées

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Tailwind CSS 4** - Framework CSS
- **React Router 6** - Routing
- **TanStack Query** - Gestion des données serveur
- **Axios** - Client HTTP
- **Lucide React** - Icônes

## 🐳 Docker

### Construction de l'image

```bash
docker build -t elidune-ui .
```

### Lancement du conteneur

```bash
docker run -p 80:80 elidune-ui
```

### Avec Docker Compose

```yaml
version: '3.8'
services:
  elidune-ui:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://api:8080
    depends_on:
      - api
```

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.
