export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI_INTERNALS__.invoke(cmd, args);
}

export async function getBooksPath(): Promise<string | null> {
    if (!isTauri()) return null;
    return tauriInvoke<string | null>('get_books_path');
}

export async function openFolderDialog(): Promise<string | null> {
    if (!isTauri()) return null;
    return tauriInvoke<string | null>('open_file_dialog');
}

export async function saveBooksPath(booksPath: string): Promise<void> {
    if (!isTauri()) return;
    return tauriInvoke('save_books_path', { booksPath });
}

export async function startSidecars(booksPath: string): Promise<void> {
    if (!isTauri()) return;
    return tauriInvoke('start_sidecars', { booksPath });
}

export async function getAppUrl(): Promise<string> {
    if (!isTauri()) return 'http://localhost:3000';
    return tauriInvoke<string>('get_app_url');
}

export async function openInBrowserAndHide(): Promise<void> {
    if (!isTauri()) return;
    return tauriInvoke('open_in_browser_and_hide');
}

export async function getDataDir(): Promise<string | null> {
    if (!isTauri()) return null;
    const { appDataDir } = await import('@tauri-apps/api/path');
    return appDataDir();
}

export async function openPath(path: string): Promise<void> {
    if (!isTauri()) return;
    return tauriInvoke('open_path', { path });
}
