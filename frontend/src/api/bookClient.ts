import { Book, SearchParams, SearchResponse, TagUpdateRequest, StatsResponse } from '../types/book';

const API_BASE = '/api/books';

export const bookClient = {
  async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();
    if (params.title) queryParams.append('title', params.title);
    if (params.author) queryParams.append('author', params.author);
    if (params.genre) queryParams.append('genre', params.genre);
    if (params.type) queryParams.append('type', params.type);
    queryParams.append('page', String(params.page || 0));
    queryParams.append('pageSize', String(params.pageSize || 20));

    const response = await fetch(`${API_BASE}/search?${queryParams}`);
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    return response.json();
  },

  async searchBulk(bookIds: string[], page: number = 0, pageSize: number = 20): Promise<SearchResponse & { missingIds: string[] }> {
    const response = await fetch(`${API_BASE}/search/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookIds, page, pageSize })
    });
    if (!response.ok) throw new Error(`Bulk search failed: ${response.statusText}`);
    return response.json();
  },

  async getBook(id: number): Promise<Book> {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error(`Book not found: ${response.statusText}`);
    return response.json();
  },

  async updateTag(id: number, request: TagUpdateRequest): Promise<Book> {
    const response = await fetch(`${API_BASE}/${id}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
    return response.json();
  },

  async getGenres(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/genres`);
    if (!response.ok) throw new Error(`Failed to fetch genres: ${response.statusText}`);
    return response.json();
  },

  async getTypes(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/types`);
    if (!response.ok) throw new Error(`Failed to fetch types: ${response.statusText}`);
    return response.json();
  },

  async getStats(): Promise<StatsResponse> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.statusText}`);
    return response.json();
  }
};
