import React from 'react';

export function Card({
  className = '',
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-border bg-card ${
        onClick
          ? 'cursor-pointer transition-colors hover:border-input hover:bg-muted/30'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-[12px] font-semibold tracking-[0.005em] text-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}
