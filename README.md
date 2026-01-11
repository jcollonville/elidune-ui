# Elidune UI

A modern React-based user interface for the Elidune library management system. This frontend application provides an intuitive and responsive experience for managing library operations, from catalog browsing to administrative tasks.

## Features

### For All Users

- **Catalog**: Search and browse the library catalog with advanced filtering options
- **My Loans**: View current loans, loan history, and manage renewals
- **Renewals**: Extend loan periods directly from the interface
- **Adaptive Theme**: Automatic dark/light mode based on system preferences

### For Librarians

- **User Management**: Create, modify, and manage user accounts
- **Statistics Dashboard**: View activity statistics and library metrics
- **Loan Management**: Record new loans and process returns

### For Administrators

- **Settings**: Configure loan rules per document type
- **Z39.50 Servers**: Manage remote catalog connections
- **System Configuration**: Full access to system parameters

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18 or higher
- npm 9+ or yarn 1.22+
- Access to the Elidune backend server (REST API)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd elidune-ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:8080
```

Adjust the API URL to match your backend server configuration.

## Getting Started

### Development Mode

To start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000. The development server includes hot module replacement for a smooth development experience.

### Production Build

To create an optimized production build:

```bash
npm run build
```

The production files will be generated in the `dist/` directory, ready for deployment.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

This is useful for testing the production build before deployment.

## Project Structure

The project follows a modular structure for maintainability:

```
elidune-ui/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   └── common/         # Generic UI components
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Layout.tsx
│   │       ├── Modal.tsx
│   │       ├── Pagination.tsx
│   │       ├── SearchInput.tsx
│   │       └── Table.tsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx # Authentication state
│   │   ├── LanguageContext.tsx # Internationalization
│   │   └── ThemeContext.tsx # Theme management
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Application pages
│   │   ├── HomePage.tsx
│   │   ├── ItemDetailPage.tsx
│   │   ├── ItemsPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MyLoansPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── StatsPage.tsx
│   │   ├── UserDetailPage.tsx
│   │   └── UsersPage.tsx
│   ├── services/          # API services
│   │   └── api.ts         # Main API client
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   ├── locales/           # Translation files
│   ├── App.tsx            # Root component
│   ├── index.css          # Global styles
│   └── main.tsx           # Application entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Customization

### Theme Configuration

The application uses Tailwind CSS with support for light and dark modes. You can customize the color scheme in `src/index.css`:

```css
:root {
  --color-primary: #6366f1;      /* Indigo */
  --color-primary-dark: #4f46e5;
  --color-accent: #f59e0b;       /* Amber */
  --color-success: #10b981;       /* Emerald */
  --color-danger: #ef4444;       /* Red */
  --color-warning: #f59e0b;      /* Amber */
}
```

### Theme Modes

The application automatically detects system preferences, but users can manually select a theme:

- **Light**: Bright theme for daytime use
- **Dark**: Dark theme for reduced eye strain
- **System**: Follows the operating system's theme preference

## Responsive Design

The interface is fully responsive and adapts to different screen sizes:

- **Mobile** (< 640px): Hamburger menu navigation, single-column layout
- **Tablet** (640px - 1024px): Adaptive layout with optimized spacing
- **Desktop** (> 1024px): Fixed sidebar, multi-column layouts

## Authentication

Authentication uses JWT tokens stored in localStorage. Routes are protected based on account type:

| Account Type | Access Level |
|--------------|--------------|
| Guest | Read-only catalog access |
| Reader | Catalog + personal loans |
| Librarian | + User management + Statistics |
| Administrator | + System settings |

The application supports two-factor authentication (2FA) with TOTP and email-based verification. Trusted devices can bypass 2FA for 90 days.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint code analysis |

## API Proxy

During development, requests to `/api` are automatically proxied to the backend server configured in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

This allows you to work with the frontend and backend on different ports without CORS issues.

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS 4** - Utility-first CSS framework
- **React Router 7** - Client-side routing
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **i18next** - Internationalization support

## Docker

### Building the Image

```bash
docker build -t elidune-ui .
```

### Running the Container

```bash
docker run -p 80:80 elidune-ui
```

### Docker Compose

For a complete setup with the backend API:

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

## Internationalization

The application supports multiple languages. Translation files are located in `src/locales/`:

- English (en)
- French (fr)
- German (de)
- Spanish (es)

The language is automatically detected from browser preferences, but users can manually change it in their profile settings.

## License

This project is proprietary software. All rights reserved.
