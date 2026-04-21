import { invoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getBooksPath(): Promise<string | null> {
    if (!isTauri()) return null;
    return invoke<string | null>('get_books_path');
}

export async function openFolderDialog(): Promise<string | null> {
    if (!isTauri()) return null;
    return invoke<string | null>('open_file_dialog');
}

export async function startSidecars(booksPath: string): Promise<void> {
    if (!isTauri()) return;
    return invoke('start_sidecars', { booksPath });
}
