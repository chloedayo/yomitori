import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SetupWizard } from './SetupWizard'
import * as tauriApi from '../../lib/tauriApi'

vi.mock('../../lib/tauriApi', () => ({
    isTauri: vi.fn(() => true),
    openFolderDialog: vi.fn(),
    saveBooksPath: vi.fn(),
    startSidecars: vi.fn(),
}))

describe('SetupWizard', () => {
    const mockOnComplete = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders welcome screen with Pick Folder button', () => {
        render(<SetupWizard onComplete={mockOnComplete} />)
        expect(screen.getByText(/where are your books/i)).toBeTruthy()
        expect(screen.getByRole('button', { name: /pick folder/i })).toBeTruthy()
    })

    it('shows selected path and continue button after folder pick', async () => {
        vi.mocked(tauriApi.openFolderDialog).mockResolvedValue('/home/user/books')
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))

        await waitFor(() => {
            expect(screen.getByText('/home/user/books')).toBeTruthy()
            expect(screen.getByTestId('continue-btn')).toBeTruthy()
        })
    })

    it('calls saveBooksPath, startSidecars, and onComplete on Continue click', async () => {
        vi.mocked(tauriApi.openFolderDialog).mockResolvedValue('/home/user/books')
        vi.mocked(tauriApi.saveBooksPath).mockResolvedValue(undefined)
        vi.mocked(tauriApi.startSidecars).mockResolvedValue(undefined)
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))
        await waitFor(() => expect(screen.getByTestId('continue-btn')).toBeTruthy())
        fireEvent.click(screen.getByTestId('continue-btn'))

        await waitFor(() => {
            expect(tauriApi.saveBooksPath).toHaveBeenCalledWith('/home/user/books')
            expect(tauriApi.startSidecars).toHaveBeenCalledWith('/home/user/books')
            expect(mockOnComplete).toHaveBeenCalled()
        })
    })

    it('shows error and does NOT persist booksPath when startSidecars rejects', async () => {
        vi.mocked(tauriApi.openFolderDialog).mockResolvedValue('/home/user/books')
        vi.mocked(tauriApi.startSidecars).mockRejectedValue(new Error('port conflict'))
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))
        await waitFor(() => expect(screen.getByTestId('continue-btn')).toBeTruthy())
        fireEvent.click(screen.getByTestId('continue-btn'))

        await waitFor(() => {
            expect(tauriApi.startSidecars).toHaveBeenCalledWith('/home/user/books')
            expect(screen.getByText(/failed to start backend/i)).toBeTruthy()
        })
        // Critical: booksPath must NOT be persisted, else next launch skips wizard.
        expect(tauriApi.saveBooksPath).not.toHaveBeenCalled()
        expect(mockOnComplete).not.toHaveBeenCalled()
        // Continue button re-enabled so user can retry.
        expect((screen.getByTestId('continue-btn') as HTMLButtonElement).disabled).toBe(false)
    })

    it('shows error and does not complete when saveBooksPath rejects', async () => {
        vi.mocked(tauriApi.openFolderDialog).mockResolvedValue('/home/user/books')
        vi.mocked(tauriApi.startSidecars).mockResolvedValue(undefined)
        vi.mocked(tauriApi.saveBooksPath).mockRejectedValue(new Error('disk full'))
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))
        await waitFor(() => expect(screen.getByTestId('continue-btn')).toBeTruthy())
        fireEvent.click(screen.getByTestId('continue-btn'))

        await waitFor(() => {
            expect(tauriApi.saveBooksPath).toHaveBeenCalled()
            expect(screen.getByText(/failed to save books path/i)).toBeTruthy()
        })
        expect(mockOnComplete).not.toHaveBeenCalled()
    })

    it('does not call saveBooksPath when startSidecars rejects', async () => {
        vi.mocked(tauriApi.openFolderDialog).mockResolvedValue('/home/user/books')
        vi.mocked(tauriApi.startSidecars).mockRejectedValue(new Error('boom'))
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))
        await waitFor(() => expect(screen.getByTestId('continue-btn')).toBeTruthy())
        fireEvent.click(screen.getByTestId('continue-btn'))

        await waitFor(() => expect(tauriApi.startSidecars).toHaveBeenCalled())
        expect(tauriApi.saveBooksPath).not.toHaveBeenCalled()
    })

    it('allows changing folder selection', async () => {
        vi.mocked(tauriApi.openFolderDialog)
            .mockResolvedValueOnce('/home/user/books')
            .mockResolvedValueOnce('/home/user/manga')
        render(<SetupWizard onComplete={mockOnComplete} />)

        fireEvent.click(screen.getByRole('button', { name: /pick folder/i }))
        await waitFor(() => expect(screen.getByText('/home/user/books')).toBeTruthy())

        fireEvent.click(screen.getByTestId('change-btn'))
        await waitFor(() => expect(screen.getByText('/home/user/manga')).toBeTruthy())
    })
})
