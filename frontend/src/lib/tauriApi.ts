export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI__.core.invoke(cmd, args);
}

export async function getBooksPath(): Promise<string | null> {
    if (!isTauri()) return null;
    return tauriInvoke<string | null>('get_books_path');
}

export async function openFolderDialog(): Promise<string | null> {
    if (!isTauri()) return null;
    return tauriInvoke<string | null>('open_file_dialog');
}

export async function startSidecars(booksPath: string): Promise<void> {
    if (!isTauri()) return;
    return tauriInvoke('start_sidecars', { booksPath });
}
