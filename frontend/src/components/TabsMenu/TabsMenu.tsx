import { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import './style.scss';

interface TabsMenuProps {
  hiddenCount: number;
  onNavigateToHidden: () => void;
}

export function TabsMenu({ hiddenCount, onNavigateToHidden }: TabsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (hiddenCount === 0) {
    return null;
  }

  const handleShowHidden = () => {
    onNavigateToHidden();
    setIsOpen(false);
  };

  return (
    <div className="tabs-menu-wrapper">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="menu-button"
        title="Menu"
      >
        <MoreVertIcon sx={{ color: '#d0d0d0' }} />
      </button>

      {isOpen && (
        <div className="menu-dropdown">
          <button onClick={handleShowHidden}>
            Show hidden books ({hiddenCount})
          </button>
        </div>
      )}

      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
