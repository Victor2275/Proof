import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Recipe } from '../models/Recipe.js';

// Construct __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/culinary_lab';

// Helper to parse strings like "1 1/2 cups" into quantity and unit
function parseIngredientMeasure(measureString) {
  if (!measureString || !measureString.trim()) {
    return { quantity: 1, unit: 'to taste' };
  }
  
  const cleanStr = measureString.trim();
  // Match a leading number, decimal, or fraction (e.g., "1", "1.5", "1/2", "1 1/2")
  // and the rest as the unit.
  const match = cleanStr.match(/^([\d\s\.\/½¼¾]+)\s*(.*)$/);
  
  if (match) {
    let numStr = match[1].trim();
    let unitStr = match[2].trim();
    
    // Convert common fraction characters
    numStr = numStr.replace('½', '0.5').replace('¼', '0.25').replace('¾', '0.75');
    
    let quantity = 1;
    
    try {
      if (numStr.includes(' ')) {
        const parts = numStr.split(' ');
        let sum = 0;
        for (const p of parts) {
          if (p.includes('/')) {
            const [num, den] = p.split('/');
            sum += parseFloat(num) / parseFloat(den);
          } else {
            sum += parseFloat(p);
          }
        }
        quantity = sum;
      } else if (numStr.includes('/')) {
        const [num, den] = numStr.split('/');
        quantity = parseFloat(num) / parseFloat(den);
      } else {
        quantity = parseFloat(numStr);
      }
    } catch (e) {
      // fallback
      quantity = 1;
      unitStr = cleanStr; // put the whole thing in unit if parse fails
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      quantity = 1;
      unitStr = cleanStr;
    }
    
    return { quantity, unit: unitStr || 'unit' };
  }
  
  // No leading number found
  return { quantity: 1, unit: cleanStr };
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
    }
  }
}

async function seedRecipes() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');
    
    console.log('Fetching categories from TheMealDB...');
    const catData = await fetchWithRetry('https://www.themealdb.com/api/json/v1/1/categories.php');
    const categories = catData.categories.map(c => c.strCategory);
    console.log(`Found ${categories.length} categories.`);
    
    let allMealIds = [];
    
    // Fetch all meals in all categories to get a good spread
    for (const cat of categories) {
      console.log(`Fetching meals for category: ${cat}...`);
      const mealData = await fetchWithRetry(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${cat}`);
      if (mealData && mealData.meals) {
        allMealIds = allMealIds.concat(mealData.meals.map(m => m.idMeal));
      }
      // slight delay to respect API rate limits
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Shuffle the meal IDs to get a random mix
    allMealIds.sort(() => 0.5 - Math.random());
    
    // Take the first 200 (or more if you want to ensure we hit exactly 200 valid ones, maybe 210)
    const targetCount = 200;
    const mealIdsToFetch = allMealIds.slice(0, targetCount + 20); // extra buffer
    
    console.log(`Going to fetch details for ${mealIdsToFetch.length} meals to ensure we get ${targetCount} good ones.`);
    
    const recipesToInsert = [];
    
    for (let i = 0; i < mealIdsToFetch.length; i++) {
      if (recipesToInsert.length >= targetCount) break;
      
      const id = mealIdsToFetch[i];
      try {
        const detailData = await fetchWithRetry(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
        const meal = detailData.meals[0];
        
        if (!meal) continue;
        
        const ingredients = [];
        for (let j = 1; j <= 20; j++) {
          const name = meal[`strIngredient${j}`];
          const measure = meal[`strMeasure${j}`];
          
          if (name && name.trim()) {
            const { quantity, unit } = parseIngredientMeasure(measure);
            ingredients.push({
              name: name.trim(),
              quantity,
              unit
            });
          }
        }
        
        // Parse instructions into steps
        let instructions = [];
        if (meal.strInstructions) {
          instructions = meal.strInstructions
            .split(/(?:\r\n|\r|\n)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
        
        // If instructions is empty for some reason, provide a dummy one
        if (instructions.length === 0) {
          instructions.push("Prepare ingredients and cook according to standard methods.");
        }
        
        recipesToInsert.push({
          title: meal.strMeal,
          description: `A delicious ${meal.strArea || ''} ${meal.strCategory || ''} dish.`,
          imageUrls: meal.strMealThumb ? [meal.strMealThumb] : [],
          servings: 4,
          difficulty: 'Medium',
          prepTime: '20 mins',
          cookTime: '30 mins',
          tags: [meal.strCategory, meal.strArea].filter(Boolean),
          folder: meal.strCategory || 'Uncategorized',
          ingredients,
          instructions
        });
        
        if (recipesToInsert.length % 20 === 0) {
          console.log(`Prepared ${recipesToInsert.length} recipes...`);
        }
      } catch (err) {
        console.error(`Failed to fetch details for meal ID ${id}:`, err.message);
      }
      
      // Delay to avoid hitting rate limits on free API
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`Successfully prepared ${recipesToInsert.length} recipes. Inserting into MongoDB...`);
    
    const result = await Recipe.insertMany(recipesToInsert);
    console.log(`Inserted ${result.length} recipes successfully!`);
    
  } catch (error) {
    console.error('Error seeding recipes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seedRecipes();
