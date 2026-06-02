import React, { useEffect } from 'react';
import IC from './icons';

export default function SlideOver({ title, sub, onClose, children, footer }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <>
      <div className="ad-backdrop" onClick={onClose} />
      <div className="ad-panel" role="dialog" aria-modal="true">
        <div className="ad-panel-header">
          <div>
            <div className="ad-panel-title">{title}</div>
            {sub && <div className="ad-panel-sub">{sub}</div>}
          </div>
          <button className="ad-panel-close" onClick={onClose} aria-label="Close">
            <IC.X />
          </button>
        </div>
        <div className="ad-panel-body">{children}</div>
        {footer && <div className="ad-panel-footer">{footer}</div>}
      </div>
    </>
  );
}
