import { useState } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import './style.scss';

interface CardMenuProps {
  onHide: () => void | Promise<void>;
  onClearBookmark?: () => void | Promise<void>;
  isHidden?: boolean;
  hasBookmark?: boolean;
}

export function CardMenu({ onHide, onClearBookmark, isHidden, hasBookmark }: CardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleHideClick = async () => {
    await onHide();
    setIsOpen(false);
  };

  const handleClearBookmarkClick = async () => {
    await onClearBookmark?.();
    setIsOpen(false);
  };

  return (
    <div className="menu-wrapper">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="menu-button"
        title="Menu"
      >
        <MenuIcon sx={{ color: '#d0d0d0' }} />
      </button>

      {isOpen && (
        <div className="menu-dropdown">
          <button onClick={handleHideClick}>
            {isHidden ? 'Unhide book' : 'Hide book'}
          </button>
          {hasBookmark && (
            <button onClick={handleClearBookmarkClick}>
              Remove from In Progress
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
