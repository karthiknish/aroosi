// src/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: number; // size of the spinner in pixels
  color?: string; // color of the spinner
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 40, color = 'currentColor' }) => {
  const spinnerStyle: React.CSSProperties = {
    width: size,
    height: size,
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderLeftColor: color,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  };

  const keyframesStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <>
      <style>{keyframesStyle}</style>
      <div style={spinnerStyle} role="status" aria-label="Loading...">
        <span className="sr-only">Loading...</span>
      </div>
    </>
  );
};

export default LoadingSpinner;
