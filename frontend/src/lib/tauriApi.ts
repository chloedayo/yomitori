export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getBooksPath(): Promise<string | null> {
    if (!isTauri()) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string | null>('get_books_path');
}

export async function openFolderDialog(): Promise<string | null> {
    if (!isTauri()) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string | null>('open_file_dialog');
}

export async function startSidecars(booksPath: string): Promise<void> {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('start_sidecars', { booksPath });
}
