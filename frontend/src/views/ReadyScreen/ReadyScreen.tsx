import { useEffect, useState } from 'react'
import { getAppUrl, openInBrowserAndHide, startSidecars, getBooksPath, saveBooksPath } from '../../lib/tauriApi'
import './ReadyScreen.scss'

export function ReadyScreen({ onChangeFolder }: { onChangeFolder?: () => void }) {
    const [url, setUrl] = useState<string>('')
    const [starting, setStarting] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const appUrl = await getAppUrl()
                if (cancelled) return
                setUrl(appUrl)

                const booksPath = await getBooksPath()
                if (!booksPath) throw new Error('books path missing')
                await startSidecars(booksPath)
                if (cancelled) return
                setStarting(false)
            } catch (e) {
                if (!cancelled) setError(String(e))
            }
        })()
        return () => { cancelled = true }
    }, [])

    return (
        <div className="ready-screen">
            <h1>yomitori</h1>
            {error ? (
                <p className="error">Startup failed: {error}</p>
            ) : starting ? (
                <p>Starting services…</p>
            ) : (
                <>
                    <p>Services running. Open in your browser:</p>
                    <code className="url">{url}</code>
                    <button onClick={() => openInBrowserAndHide()}>Open Yomitori</button>
                    <p className="hint">The app will keep running in the system tray. Click the tray icon anytime to reopen.</p>
                    <button className="secondary" onClick={async () => {
                        await saveBooksPath('')
                        onChangeFolder?.()
                    }}>Change books folder</button>
                </>
            )}
        </div>
    )
}
