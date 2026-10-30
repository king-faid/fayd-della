'use client';

export default function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">{children}</div>
    </div>
  );
}
