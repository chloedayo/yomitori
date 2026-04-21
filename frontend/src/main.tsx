import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { SetupWizard } from './views/SetupWizard/SetupWizard.tsx'
import { isTauri, getBooksPath } from './lib/tauriApi.ts'
import { requestPersistentStorage } from './services/syncService'

requestPersistentStorage()

function Root() {
    // null = checking, true = show wizard, false = show app
    const [showWizard, setShowWizard] = useState<boolean | null>(
        isTauri() ? null : false
    )

    useEffect(() => {
        if (!isTauri()) return
        getBooksPath().then(path => {
            setShowWizard(path === null)
        }).catch(() => {
            setShowWizard(false)
        })
    }, [])

    if (showWizard === null) {
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

    if (showWizard) {
        return <SetupWizard onComplete={() => setShowWizard(false)} />
    }

    return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
