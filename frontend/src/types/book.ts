export interface Book {
  id: string;
  filepath: string;
  filename: string;
  title: string;
  genre: string | null;
  type: string;
  coverPath: string | null;
  fileFormat: string;
  lastIndexed: string;
  isDeleted: boolean;
  manualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchParams {
  title?: string;
  author?: string;
  genre?: string | null;
  type?: string | null;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  content: Book[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

export interface TagUpdateRequest {
  genre: string | null;
  type: string | null;
}

export interface StatsResponse {
  total: number;
  active: number;
  deleted: number;
  genres: number;
  types: number;
}
