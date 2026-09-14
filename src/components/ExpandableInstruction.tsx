import { useState } from 'react';
import { renderWithTimers } from '../utils/timerParser';

export default function ExpandableInstruction({ text = '', index }: { text: string, index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (text || '').length > 150;

  return (
    <li className="flex gap-4">
      <span className="font-medium text-ink-muted min-w-[20px]">{index + 1}.</span>
      <div className="flex-1">
        <p className={`leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {renderWithTimers(text || '', `Step ${index + 1}`)}
        </p>
        {!expanded && isLong && (
          <button onClick={() => setExpanded(true)} className="text-ink font-bold text-sm mt-1 underline">Read more</button>
        )}
      </div>
    </li>
  );
}
