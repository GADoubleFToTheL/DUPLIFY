import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type BrickColor = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'white';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: BrickColor;
  studs?: number;
  icon?: ReactNode;
  label?: ReactNode;
  size?: 's' | 'm' | 'l' | 'xl';
  testId?: string;
}

/** Knopf, der wie ein Baustein mit Noppen aussieht und sich beim Drücken eindrückt. */
export function BrickButton({ color = 'red', studs = 2, icon, label, size = 'm', className = '', testId, children, ...rest }: Props) {
  return (
    <button className={`brick-btn c-${color} size-${size} ${className}`} data-testid={testId} {...rest}>
      <span className="studs" aria-hidden="true">
        {Array.from({ length: studs }, (_, i) => (
          <span key={i} className="stud" />
        ))}
      </span>
      {icon && <span className="icon">{icon}</span>}
      {label && <span className="label">{label}</span>}
      {children}
    </button>
  );
}
