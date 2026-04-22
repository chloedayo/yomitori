import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SetupWizard } from './views/SetupWizard/SetupWizard.tsx'
import { isTauri, getBooksPath } from './lib/tauriApi.ts'
import { requestPersistentStorage } from './services/syncService'

requestPersistentStorage()

type View = 'checking' | 'wizard' | 'app' | 'error'

function Root() {
    // Browser tab: skip IPC check entirely, go straight to app.
    // Tauri window: check booksPath via IPC to decide wizard vs app.
    const [view, setView] = useState<View>(isTauri() ? 'checking' : 'app')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isTauri()) return
        getBooksPath()
            .then(path => setView(path ? 'app' : 'wizard'))
            .catch(err => {
                console.error('[main] getBooksPath failed', err)
                setError(`Launcher IPC unavailable: ${err}`)
                setView('error')
            })
    }, [])

    if (view === 'checking') {
        // Brief IPC check — native launcher splash still covers the window
        // at this point, so rendering nothing avoids a visible flash.
        return null
    }

    if (view === 'error') {
        return (
            <div role="alert" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
                <h2>Launcher IPC unavailable</h2>
                <p>Please restart Yomitori.</p>
                {error && <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>}
            </div>
        )
    }

    if (view === 'wizard') {
        return <SetupWizard onComplete={() => setView('app')} />
    }

    return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
