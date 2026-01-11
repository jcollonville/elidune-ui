// User types
export interface User {
  id: number;
  username: string;
  login?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  barcode?: string;
  account_type?: string;
  account_type_id?: number;
  language?: string;
  // Address fields
  addr_street?: string;
  addr_zip_code?: number;
  addr_city?: string;
  // Additional fields
  occupation_id?: number;
  birthdate?: string;
  // 2FA fields
  two_factor_enabled?: boolean;
  two_factor_method?: string;
}

// Update profile request type
export interface UpdateProfileRequest {
  firstname?: string;
  lastname?: string;
  email?: string;
  login?: string;
  addr_street?: string;
  addr_zip_code?: number;
  addr_city?: string;
  phone?: string;
  occupation_id?: number;
  birthdate?: string;
  current_password?: string;
  new_password?: string;
  language?: string;
}

export interface UserShort {
  id: number;
  firstname?: string;
  lastname?: string;
  account_type?: string;
  nb_loans?: number;
  nb_late_loans?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  device_id?: string;
}

export interface LoginResponse {
  token?: string;
  token_type: string;
  expires_in: number;
  requires_2fa: boolean;
  two_factor_method?: string;
  device_id?: string;
  user: {
    id: number;
    username: string;
    login: string;
    firstname?: string;
    lastname?: string;
    account_type: string;
    language: string;
  };
}

// 2FA Types
export type TwoFactorMethod = 'totp' | 'email';

export interface Setup2FARequest {
  method: TwoFactorMethod;
}

export interface Setup2FAResponse {
  provisioning_uri?: string;
  recovery_codes: string[];
}

export interface Verify2FARequest {
  user_id: number;
  code: string;
  trust_device?: boolean;
  device_id?: string;
}

export interface Verify2FAResponse {
  token: string;
  token_type: string;
  expires_in: number;
  device_id?: string;
}

export interface VerifyRecoveryRequest {
  user_id: number;
  code: string;
}

// Item types
export interface Item {
  id: number;
  media_type?: string;
  identification?: string;
  title1?: string;
  title2?: string;
  title3?: string;
  publication_date?: string;
  lang?: number;
  authors1?: Author[];
  authors2?: Author[];
  edition?: Edition;
  serie?: Serie;
  collection?: Collection;
  specimens?: Specimen[];
  abstract_?: string;
  keywords?: string;
  subject?: string;
  nb_specimens?: number;
  is_valid?: number;
}

export interface ItemShort {
  id: number;
  media_type?: string;
  identification?: string;
  title?: string;
  date?: string;
  status?: number;
  is_local?: number;
  is_archive?: number;
  authors?: Author[];
}

export interface Author {
  id: number;
  lastname?: string;
  firstname?: string;
  function?: string;
}

export interface Edition {
  id: number;
  name?: string;
  place?: string;
  date?: string;
}

export interface Serie {
  id: number;
  name?: string;
  volume_number?: number;
}

export interface Collection {
  id: number;
  title1?: string;
  issn?: string;
}

export interface Specimen {
  id: number;
  identification?: string;
  cote?: string;
  status?: number;
  source_name?: string;
  availability?: number;
}

// Loan types
export interface Loan {
  id: number;
  start_date: number;
  issue_date: number;
  renewal_date?: number;
  nb_renews: number;
  item: ItemShort;
  user?: UserShort;
  specimen_identification?: string;
  is_overdue: boolean;
}

// Stats types
export interface Stats {
  items: {
    total: number;
    by_media_type: StatEntry[];
    by_public_type: StatEntry[];
  };
  users: {
    total: number;
    active: number;
    by_account_type: StatEntry[];
  };
  loans: {
    active: number;
    overdue: number;
    returned_today: number;
    by_media_type: StatEntry[];
  };
}

export interface StatEntry {
  label: string;
  value: number;
}

// Time-based stats for charts
export interface LoanTimeStats {
  date: string;
  loans: number;
  returns: number;
}

export interface UserLoanStats {
  user_id: number;
  firstname: string;
  lastname: string;
  total_loans: number;
  active_loans: number;
  overdue_loans: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// Error response
export interface ApiError {
  code: number;
  error: string;
  message: string;
}

// Settings
export interface LoanSettings {
  media_type: string;
  max_loans: number;
  max_renewals: number;
  duration_days: number;
}

export interface Settings {
  loan_settings: LoanSettings[];
  z3950_servers: Z3950Server[];
}

export interface Z3950Server {
  id: number;
  name: string;
  address: string;
  port: number;
  database?: string;
  format?: string;
  is_active: boolean;
}

// Account types for permissions
export type AccountType = 'Guest' | 'Reader' | 'Librarian' | 'Administrator';

export const isAdmin = (accountType?: string): boolean => 
  accountType === 'Administrator';

export const isLibrarian = (accountType?: string): boolean => 
  accountType === 'Administrator' || accountType === 'Librarian';

export const canManageItems = (accountType?: string): boolean => 
  isLibrarian(accountType);

export const canManageUsers = (accountType?: string): boolean => 
  isLibrarian(accountType);

export const canManageLoans = (accountType?: string): boolean => 
  isLibrarian(accountType);

export const canViewStats = (accountType?: string): boolean => 
  isLibrarian(accountType);

export const canManageSettings = (accountType?: string): boolean => 
  isAdmin(accountType);


