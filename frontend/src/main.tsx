import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SetupWizard } from './views/SetupWizard/SetupWizard.tsx'
import { ReadyScreen } from './views/ReadyScreen/ReadyScreen.tsx'
import { isTauri, getBooksPath } from './lib/tauriApi.ts'
import { requestPersistentStorage } from './services/syncService'

requestPersistentStorage()

type View = 'loading' | 'wizard' | 'ready' | 'web-app'

function Root() {
    const [view, setView] = useState<View>(isTauri() ? 'loading' : 'web-app')

    useEffect(() => {
        if (!isTauri()) return
        getBooksPath()
            .then(path => setView(path ? 'ready' : 'wizard'))
            .catch(() => setView('ready'))
    }, [])

    if (view === 'loading') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: '#0d0d0d', color: '#888',
                fontFamily: 'sans-serif'
            }}>
                Loading...
            </div>
        )
    }

    if (view === 'wizard') {
        return <SetupWizard onComplete={() => setView('ready')} />
    }

    if (view === 'ready') {
        return <ReadyScreen />
    }

    return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
