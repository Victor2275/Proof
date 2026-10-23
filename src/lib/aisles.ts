/*
 * Which aisle a thing is in (change 121), so the list reads in the order a
 * shop is walked rather than the order recipes happened to name things. A
 * guess from the words, deliberately plain: an item that matches nothing goes
 * under "Everything else", never into a wrong aisle with confidence.
 */
export const AISLES = [
  { id: 'produce', label: 'Fruit and veg', words: /\b(apples?|bananas?|lemons?|limes?|oranges?|berr(y|ies)|onions?|garlic|shallots?|potato(es)?|carrots?|celery|tomato(es)?|peppers?|chill(i|ies)|ginger|herbs?|parsley|coriander|cilantro|basil|thyme|rosemary|mint|dill|spinach|lettuce|cabbage|kale|leeks?|mushrooms?|courgettes?|zucchini|aubergines?|eggplants?|cucumbers?|avocados?|peas|beans? sprouts|spring onions?|scallions?|squash|pumpkin|fennel|beetroot|rhubarb|plums?|pears?|peaches?|cherr(y|ies)|grapes?)\b/i },
  { id: 'dairy', label: 'Dairy and eggs', words: /\b(milk|butter|cream|cheese|yog(h)?urt|eggs?|cr[eè]me fra[iî]che|ricotta|mascarpone|mozzarella|parmesan|feta|buttermilk|ghee|quark)\b/i },
  { id: 'meat', label: 'Meat and fish', words: /\b(chicken|beef|pork|lamb|mince|bacon|ham|sausages?|turkey|duck|steak|fish|salmon|cod|tuna|prawns?|shrimp|anchov(y|ies)|chorizo|veal)\b/i },
  { id: 'bakery', label: 'Flour, grains and bread', words: /\b(flour|yeast|bread|rolls?|oats|rice|pasta|noodles|couscous|quinoa|polenta|semolina|cornmeal|breadcrumbs|tortillas?|wraps?|crackers?)\b/i },
  { id: 'baking', label: 'Baking and sweet', words: /\b(sugar|honey|syrup|chocolate|cocoa|vanilla|baking (powder|soda)|bicarbonate|cornflour|cornstarch|gelatin|icing|sprinkles|golden syrup|molasses|treacle|jam|marmalade|nuts?|almonds?|walnuts?|pecans?|hazelnuts?|raisins|sultanas|dates|coconut)\b/i },
  { id: 'cupboard', label: 'Tins, jars and oils', words: /\b(oil|vinegar|stock|broth|tinned|canned|tins?|cans?|passata|tomato (paste|pur[eé]e)|soy sauce|mustard|mayonnaise|ketchup|sauce|beans|chickpeas|lentils|olives|capers|tahini|peanut butter)\b/i },
  { id: 'spices', label: 'Spices and seasoning', words: /\b(salt|pepper|cumin|paprika|cinnamon|nutmeg|cloves?|cardamom|turmeric|coriander seeds?|chilli flakes|oregano|bay leaves?|allspice|curry powder|garam masala|saffron|star anise|seasoning)\b/i },
  { id: 'frozen', label: 'Frozen', words: /\b(frozen|ice cream|puff pastry|filo|phyllo)\b/i },
] as const;

export const OTHER_AISLE = { id: 'other', label: 'Everything else' } as const;

export function aisleOf(name: string): { id: string; label: string } {
  // "frozen peas" is frozen before it is veg: check the more particular aisles first.
  const frozen = AISLES.find((a) => a.id === 'frozen')!;
  if (frozen.words.test(name)) return frozen;
  return AISLES.find((a) => a.words.test(name)) ?? OTHER_AISLE;
}

/** Items grouped by aisle, in the order the aisles are listed, empty aisles left out. */
export function byAisle<T extends { name: string }>(items: T[]): { id: string; label: string; items: T[] }[] {
  const order = [...AISLES.filter((a) => a.id !== 'frozen'), AISLES.find((a) => a.id === 'frozen')!, OTHER_AISLE];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const { id } = aisleOf(item.name);
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  return order.filter((a) => groups.has(a.id)).map((a) => ({ id: a.id, label: a.label, items: groups.get(a.id)! }));
}
