import React from 'react';
import { StarIcon } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'lg';
}

export function StarRating({ value, onChange, size = 'sm' }: StarRatingProps) {
  const cls = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={onChange ? 'Rating' : `Rated ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = <StarIcon className={`${cls} ${filled ? 'fill-warn-600 text-warn-600' : 'text-line'}`} aria-hidden="true" />;
        return onChange ?
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded transition-transform duration-100 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            {star}
          </button> :

        <span key={n}>{star}</span>;

      })}
    </div>);

}