import React from 'react';
import { Recipe } from '../lib/api';
import ExpandableInstruction from './ExpandableInstruction';

interface InstructionListProps {
  recipe: Recipe;
}

export default function InstructionList({ recipe }: InstructionListProps) {
  return (
    <div>
      <h3 className="font-bold text-lg mb-6 uppercase tracking-wider">Steps / Directions</h3>
      <ol className="space-y-6">
        {(recipe.instructions || []).map((step, i) => (
          <ExpandableInstruction key={i} text={step} index={i} />
        ))}
      </ol>
    </div>
  );
}
