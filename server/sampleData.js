export const sampleRecipes = [
  {
    _id: "sample-sourdough-1",
    title: "Classic Country Sourdough",
    description: "Artisan open-crumb sourdough boule with 75% hydration and a rich caramelized crust.",
    imageUrls: [
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=800&q=80"
    ],
    servings: 2,
    difficulty: "Advanced",
    prepTime: "24 hours",
    cookTime: "45 mins",
    tags: ["sourdough", "bread", "artisan", "fermented"],
    folder: "Sourdough",
    ingredients: [
      { name: "Bread Flour", quantity: 450, unit: "g" },
      { name: "Whole Wheat Flour", quantity: 50, unit: "g" },
      { name: "Water (80°F)", quantity: 375, unit: "g" },
      { name: "Sourdough Starter (Active)", quantity: 100, unit: "g" },
      { name: "Fine Sea Salt", quantity: 10, unit: "g" }
    ],
    instructions: [
      "Autolyse: Mix flours and 350g water in a large bowl. Cover and let rest for 45 minutes.",
      "Add Starter: Dimple 100g active levain into the dough. Perform stretch and fold until incorporated.",
      "Add Salt: Add 10g salt and remaining 25g water. Perform Rubaud mixing for 5 minutes.",
      "Bulk Ferment: Perform 4 sets of stretch-and-folds every 30 minutes over 2 hours.",
      "Lamination & Coil Folds: Perform 2 sets of coil folds spaced 45 minutes apart. Bulk ferment for 4 hours total until 50% rise.",
      "Pre-shape & Bench Rest: Lightly flour surface, shape into round boule, rest uncovered for 20 minutes.",
      "Final Shape & Cold Proof: Shape tightly into banneton. Transfer to refrigerator for cold proof for 16 hours at 38°F.",
      "Bake: Preheat Dutch oven to 500°F. Score loaf, bake covered for 20 mins at 480°F, then uncovered for 22 mins at 450°F until deep mahogany."
    ],
    labNotes: "Target ambient temp: 76°F. Hydration: 75%. Baker's %: 90% white flour, 10% whole wheat.",
    versionNumber: 1,
    isLatestVersion: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: "sample-focaccia-2",
    title: "Rosemary & Sea Salt Focaccia",
    description: "Ultra-bubbly high-hydration focaccia with extra virgin olive oil, fresh rosemary, and flaky Maldon salt.",
    imageUrls: [
      "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=800&q=80"
    ],
    servings: 8,
    difficulty: "Easy",
    prepTime: "12 hours",
    cookTime: "25 mins",
    tags: ["focaccia", "italian", "olive-oil", "bread"],
    folder: "Flatbreads",
    ingredients: [
      { name: "Bread Flour", quantity: 500, unit: "g" },
      { name: "Warm Water", quantity: 420, unit: "g" },
      { name: "Instant Yeast", quantity: 4, unit: "g" },
      { name: "Honey", quantity: 5, unit: "g" },
      { name: "Extra Virgin Olive Oil", quantity: 60, unit: "ml" },
      { name: "Maldon Sea Salt", quantity: 8, unit: "g" },
      { name: "Fresh Rosemary Sprigs", quantity: 15, unit: "g" }
    ],
    instructions: [
      "Dough Mix: Whisk water, yeast, and honey. Add bread flour and salt. Mix until shaggy dough forms.",
      "Overnight Ferment: Pour 2 tbsp olive oil into bowl, coat dough, cover tight and chill in fridge for 12-24 hours.",
      "Pan Proof: Generously oil a 9x13 metal baking pan with 3 tbsp EVOO. Transfer dough and stretch lightly. Proof at room temp for 3-4 hours until dimply.",
      "Dimple & Top: Drizzle with remaining oil, press deep dimples with oiled fingers down to pan bottom. Top with rosemary and Maldon salt.",
      "Bake: Bake at 425°F for 22-25 mins until golden brown and crispy bottom."
    ],
    labNotes: "Hydration: 84%. Metal pan yields much crisper crust than glass baking dishes.",
    versionNumber: 1,
    isLatestVersion: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: "sample-pizza-3",
    title: "72-Hour Neapolitan Pizza Dough",
    description: "Traditional 00 flour Neapolitan dough fermented cold for 3 days for incredible leopard spots and flavor.",
    imageUrls: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
    ],
    servings: 4,
    difficulty: "Medium",
    prepTime: "72 hours",
    cookTime: "2 mins",
    tags: ["pizza", "neapolitan", "fermented", "dinner"],
    folder: "Pizza",
    ingredients: [
      { name: "Caputo 00 Flour", quantity: 600, unit: "g" },
      { name: "Cold Water", quantity: 390, unit: "g" },
      { name: "Fine Sea Salt", quantity: 15, unit: "g" },
      { name: "Fresh Yeast", quantity: 1, unit: "g" }
    ],
    instructions: [
      "Dissolve yeast in cold water. Gradually incorporate 00 flour.",
      "Add salt after dough begins to form. Knead by hand for 15 minutes until silky smooth (77°F internal temp).",
      "Bulk Rest: Cover and rest at room temp for 2 hours.",
      "Divide & Cold Ferment: Ball into four 250g dough balls. Place in airtight container and refrigerate for 72 hours.",
      "Bake: Remove from fridge 3 hours before baking. Stretch by hand, top with San Marzano tomatoes & fresh mozzarella, bake at 900°F for 90 seconds."
    ],
    labNotes: "65% hydration. Capable of baking in Ooni / Gozney or preheated baking steel at max home oven temp.",
    versionNumber: 1,
    isLatestVersion: true,
    createdAt: new Date().toISOString()
  }
];

export const samplePantry = [
  { _id: "p1", name: "Bread Flour", createdAt: new Date().toISOString() },
  { _id: "p2", name: "Whole Wheat Flour", createdAt: new Date().toISOString() },
  { _id: "p3", name: "Extra Virgin Olive Oil", createdAt: new Date().toISOString() },
  { _id: "p4", name: "Sourdough Starter (Active)", createdAt: new Date().toISOString() },
  { _id: "p5", name: "Maldon Sea Salt", createdAt: new Date().toISOString() }
];

export const sampleBakeLogs = [
  {
    _id: "log-1",
    recipeId: { _id: "sample-sourdough-1", title: "Classic Country Sourdough" },
    date: new Date().toISOString().split('T')[0],
    isPersonalBest: true,
    notes: "Great crumb structure! Ambient temperature was 78°F. Bulk ferment took 4.5 hours.",
    imageUrls: [
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=800&q=80"
    ]
  }
];
