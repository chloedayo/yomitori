import { useHiddenBooks } from '../hooks/useHiddenBooks'

interface TabsMenuProps {
  onNavigateToHidden: () => void
}

export function TabsMenu({ onNavigateToHidden }: TabsMenuProps) {
  const { getHidden } = useHiddenBooks()
  const hiddenCount = getHidden().length

  if (hiddenCount === 0) {
    return null
  }

  return (
    <button
      onClick={onNavigateToHidden}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px',
        padding: '12px 16px',
        color: '#a8a8a8',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#e8e8e8')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#a8a8a8')}
      title={`View ${hiddenCount} hidden book${hiddenCount !== 1 ? 's' : ''}`}
    >
      ⋯
    </button>
  )
}
