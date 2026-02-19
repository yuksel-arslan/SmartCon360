// Uniclass API Integration Service
// Official API: https://www.thenbs.com/our-tools/uniclass/api
// Classification: UK Construction Industry Standard

interface UniclassConfig {
  apiUrl: string;
  clientId?: string;
  clientSecret?: string;
}

interface UniclassNode {
  code: string;
  title: string;
  description?: string;
  children?: UniclassNode[];
}

interface UniclassTableResponse {
  table: string;
  version: string;
  items: UniclassNode[];
}

export class UniclassApiService {
  private config: UniclassConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config?: Partial<UniclassConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.UNICLASS_API_URL || 'https://api.thenbs.com/uniclass',
      clientId: config?.clientId || process.env.UNICLASS_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.UNICLASS_CLIENT_SECRET,
    };
  }

  /**
   * Authenticate with Uniclass API
   */
  private async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Uniclass API credentials not configured. Set UNICLASS_CLIENT_ID and UNICLASS_CLIENT_SECRET');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Uniclass auth failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in?: number };
      this.accessToken = data.access_token;
      // Token typically expires in 3600 seconds (1 hour)
      this.tokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

      return this.accessToken || '';
    } catch (error) {
      throw new Error(`Failed to authenticate with Uniclass API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch Uniclass table (Systems, Complexes, Entities, Activities, Spaces/Locations, Elements, Products, Materials)
   */
  async getTable(table: 'Ac' | 'Co' | 'En' | 'Pr' | 'SL' | 'EF' | 'Ss' | 'FI' | 'Zz'): Promise<UniclassTableResponse> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`${this.config.apiUrl}/v1/tables/${table}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Uniclass table ${table}: ${response.status}`);
      }

      return await response.json() as UniclassTableResponse;
    } catch (error) {
      throw new Error(`Uniclass table fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get classification by code
   */
  async getClassification(code: string): Promise<UniclassNode> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`${this.config.apiUrl}/v1/classifications/${code}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Uniclass classification ${code}: ${response.status}`);
      }

      return await response.json() as UniclassNode;
    } catch (error) {
      throw new Error(`Uniclass classification fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search Uniclass classifications
   */
  async search(query: string, table?: string): Promise<UniclassNode[]> {
    try {
      const token = await this.authenticate();
      const params = new URLSearchParams({ q: query });
      if (table) params.set('table', table);

      const response = await fetch(`${this.config.apiUrl}/v1/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Uniclass search failed: ${response.status}`);
      }

      const data = await response.json() as { results?: UniclassNode[] };
      return data.results || [];
    } catch (error) {
      throw new Error(`Uniclass search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ancestors (breadcrumb trail) for a classification
   */
  async getAncestors(code: string): Promise<UniclassNode[]> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`${this.config.apiUrl}/v1/classifications/${code}/ancestors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ancestors for ${code}: ${response.status}`);
      }

      const data = await response.json() as { ancestors?: UniclassNode[] };
      return data.ancestors || [];
    } catch (error) {
      throw new Error(`Uniclass ancestors fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get children of a classification
   */
  async getChildren(code: string): Promise<UniclassNode[]> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`${this.config.apiUrl}/v1/classifications/${code}/children`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch children for ${code}: ${response.status}`);
      }

      const data = await response.json() as { children?: UniclassNode[] };
      return data.children || [];
    } catch (error) {
      throw new Error(`Uniclass children fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if API is configured and accessible
   */
  async healthCheck(): Promise<{ available: boolean; configured: boolean; error?: string }> {
    const configured = !!(this.config.clientId && this.config.clientSecret);

    if (!configured) {
      return {
        available: false,
        configured: false,
        error: 'Uniclass API credentials not configured',
      };
    }

    try {
      await this.authenticate();
      return { available: true, configured: true };
    } catch (error) {
      return {
        available: false,
        configured: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const uniclassApiService = new UniclassApiService();
