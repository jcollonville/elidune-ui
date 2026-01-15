import axios, { AxiosError, AxiosInstance } from 'axios';
import type { 
  LoginRequest, 
  LoginResponse, 
  User, 
  UserShort,
  Item, 
  ItemShort, 
  Loan,
  Stats,
  Settings,
  PaginatedResponse,
  ApiError,
  UpdateProfileRequest,
  Setup2FARequest,
  Setup2FAResponse,
  Verify2FARequest,
  Verify2FAResponse,
  VerifyRecoveryRequest,
  AdvancedStatsParams,
  LoanStatsResponse,
  MediaType
} from '@/types';

const API_BASE_URL = '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  setDeviceId(deviceId: string) {
    localStorage.setItem('device_id', deviceId);
  }

  getDeviceId(): string | null {
    return localStorage.getItem('device_id');
  }

  clearDeviceId() {
    localStorage.removeItem('device_id');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Add device_id if available
    
    const deviceId = this.getDeviceId();
    console.log('Device ID:', deviceId);
    const loginData = deviceId ? { ...credentials, device_id: deviceId } : credentials;
    console.log('Login data:', loginData);
    const response = await this.client.post<LoginResponse>('/auth/login', loginData);
    const responseData = response.data;
    
    // Store device_id if provided in response (when 2FA is bypassed)
    if (responseData.device_id) {
      console.log('Storing device_id from login response:', responseData.device_id);
      this.setDeviceId(responseData.device_id);
      // Verify it was stored
      const stored = this.getDeviceId();
      console.log('Device ID stored in localStorage:', stored);
    }
    
    // Only set token if 2FA is not required
    if (!responseData.requires_2fa && responseData.token) {
      this.setToken(responseData.token);
    }
    return responseData;
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await this.client.put<User>('/auth/profile', data);
    return response.data;
  }

  // 2FA Methods
  async setup2FA(data: Setup2FARequest): Promise<Setup2FAResponse> {
    const response = await this.client.post<Setup2FAResponse>('/auth/setup-2fa', data);
    return response.data;
  }

  async verify2FA(data: Verify2FARequest): Promise<Verify2FAResponse> {
    const response = await this.client.post<Verify2FAResponse>('/auth/verify-2fa', data);
    const responseData = response.data;
    this.setToken(responseData.token);
    // Note: device_id is not returned in verify2FA response, it's returned in login response
    return responseData;
  }

  async verifyRecovery(data: VerifyRecoveryRequest): Promise<Verify2FAResponse> {
    const response = await this.client.post<Verify2FAResponse>('/auth/verify-recovery', data);
    this.setToken(response.data.token);
    return response.data;
  }

  async disable2FA(): Promise<void> {
    await this.client.post('/auth/disable-2fa');
  }

  // Items
  async getItems(params?: {
    title?: string;
    author?: string;
    identification?: string;
    media_type?: MediaType;
    freesearch?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<ItemShort>> {
    const response = await this.client.get<PaginatedResponse<ItemShort>>('/items', { params });
    return response.data;
  }

  async getItem(id: number): Promise<Item> {
    const response = await this.client.get<Item>(`/items/${id}`);
    return response.data;
  }

  async createItem(item: Partial<Item>): Promise<Item> {
    const response = await this.client.post<Item>('/items', item);
    return response.data;
  }

  async updateItem(id: number, item: Partial<Item>): Promise<Item> {
    const response = await this.client.put<Item>(`/items/${id}`, item);
    return response.data;
  }

  async deleteItem(id: number, force = false): Promise<void> {
    await this.client.delete(`/items/${id}`, { params: { force } });
  }

  // Users
  async getUsers(params?: {
    name?: string;
    barcode?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<UserShort>> {
    const response = await this.client.get<PaginatedResponse<UserShort>>('/users', { params });
    return response.data;
  }

  async getUser(id: number): Promise<User> {
    const response = await this.client.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(user: Partial<User> & { password?: string }): Promise<User> {
    const response = await this.client.post<User>('/users', user);
    return response.data;
  }

  async updateUser(id: number, user: Partial<User> & { password?: string }): Promise<User> {
    const response = await this.client.put<User>(`/users/${id}`, user);
    return response.data;
  }

  async deleteUser(id: number, force = false): Promise<void> {
    await this.client.delete(`/users/${id}`, { params: { force } });
  }

  // Loans
  async getUserLoans(userId: number): Promise<Loan[]> {
    const response = await this.client.get<Loan[]>(`/users/${userId}/loans`);
    return response.data;
  }

  async createLoan(data: {
    user_id: number;
    specimen_id?: number;
    specimen_identification?: string;
    force?: boolean;
  }): Promise<{ id: number; issue_date: string; message: string }> {
    const response = await this.client.post('/loans', data);
    return response.data;
  }

  async returnLoan(loanId: number): Promise<{ status: string; loan: Loan }> {
    const response = await this.client.post(`/loans/${loanId}/return`);
    return response.data;
  }

  async renewLoan(loanId: number): Promise<{ id: number; issue_date: string; message: string }> {
    const response = await this.client.post(`/loans/${loanId}/renew`);
    return response.data;
  }

  // Stats
  async getStats(): Promise<Stats> {
    const response = await this.client.get<Stats>('/stats');
    return response.data;
  }

  async getLoanStats(params: AdvancedStatsParams): Promise<LoanStatsResponse> {
    const response = await this.client.get<LoanStatsResponse>('/stats/loans', { params });
    return response.data;
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const response = await this.client.get<Settings>('/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const response = await this.client.put<Settings>('/settings', settings);
    return response.data;
  }

  // Z39.50 Search
  async searchZ3950(params: {
    isbn?: string;
    title?: string;
    author?: string;
    server_id?: number;
    max_results?: number;
  }): Promise<{ total: number; items: ItemShort[]; source: string }> {
    const response = await this.client.get('/z3950/search', { params });
    return response.data;
  }

  async importZ3950(remoteItemId: number, specimens?: { identification: string; cote?: string }[]): Promise<Item> {
    const response = await this.client.post<Item>('/z3950/import', {
      remote_item_id: remoteItemId,
      specimens,
    });
    return response.data;
  }
}

export const api = new ApiService();
export default api;


