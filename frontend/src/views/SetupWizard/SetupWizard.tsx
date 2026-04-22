import { useState } from 'react'
import { Button, CircularProgress, Typography } from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { openFolderDialog, saveBooksPath } from '../../lib/tauriApi'
import './SetupWizard.scss'

interface Props {
    onComplete: () => void
}

type Screen = 'welcome' | 'confirm'

export function SetupWizard({ onComplete }: Props) {
    const [screen, setScreen] = useState<Screen>('welcome')
    const [selectedPath, setSelectedPath] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePickFolder = async () => {
        const path = await openFolderDialog()
        if (path) {
            setSelectedPath(path)
            setScreen('confirm')
            setError(null)
        }
    }

    const handleChange = async () => {
        const path = await openFolderDialog()
        if (path) {
            setSelectedPath(path)
            setError(null)
        }
    }

    const handleContinue = async () => {
        if (!selectedPath) return
        setLoading(true)
        setError(null)
        try {
            await saveBooksPath(selectedPath)
            onComplete()
        } catch (err) {
            setError(`Failed to save: ${err}`)
            setLoading(false)
        }
    }

    return (
        <div className="setup-wizard">
            <div className="setup-wizard__card">
                <Typography variant="h4" className="setup-wizard__title">
                    yomitori ♡
                </Typography>

                {screen === 'welcome' && (
                    <>
                        <Typography variant="body1" className="setup-wizard__subtitle">
                            Where are your books?
                        </Typography>
                        <Typography variant="body2" className="setup-wizard__hint">
                            Yomitori needs to know where your book collection lives to start indexing.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<FolderOpenIcon />}
                            onClick={handlePickFolder}
                            className="setup-wizard__btn"
                            size="large"
                        >
                            Pick Folder
                        </Button>
                    </>
                )}

                {screen === 'confirm' && (
                    <>
                        <Typography variant="body1" className="setup-wizard__subtitle">
                            Books folder
                        </Typography>
                        <div className="setup-wizard__path">
                            <Typography variant="body2" className="setup-wizard__path-text">
                                {selectedPath}
                            </Typography>
                        </div>
                        {error && (
                            <Typography variant="body2" className="setup-wizard__error">
                                {error}
                            </Typography>
                        )}
                        <div className="setup-wizard__actions">
                            <Button
                                variant="outlined"
                                onClick={handleChange}
                                disabled={loading}
                                data-testid="change-btn"
                            >
                                Change
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleContinue}
                                disabled={loading}
                                endIcon={loading ? <CircularProgress size={16} /> : null}
                                data-testid="continue-btn"
                            >
                                {loading ? 'Starting...' : 'Continue'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
