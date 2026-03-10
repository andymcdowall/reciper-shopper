const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  getAllRecipes,
  getRecipeWithIngredients,
  createRecipeWithIngredients,
  deleteRecipe,
  getCartRecipes,
  addToCart,
  removeFromCart,
  getAggregatedShoppingList,
  getAllRecipesWithIngredients,
  deleteAllRecipes,
  getAllIngredients,
  getIngredientById,
  getOrCreateIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Recipe routes
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = getAllRecipes.all();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const recipe = getRecipeWithIngredients(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const { name, servings, prep_time, instructions, ingredients } = req.body;

    if (!name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Name and at least one ingredient are required' });
    }

    // Validate that all ingredients have ingredient_id, quantity, and unit
    const validIngredients = ingredients.every(ing =>
      ing.ingredient_id && typeof ing.quantity === 'number' && ing.unit
    );

    if (!validIngredients) {
      return res.status(400).json({ error: 'Each ingredient must have ingredient_id, quantity, and unit' });
    }

    const recipeId = createRecipeWithIngredients({
      name,
      servings: servings || null,
      prep_time: prep_time || null,
      instructions: instructions || '',
      ingredients
    });

    const recipe = getRecipeWithIngredients(recipeId);
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const result = deleteRecipe.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart routes
app.get('/api/cart', (req, res) => {
  try {
    const recipes = getCartRecipes.all();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/:recipeId', (req, res) => {
  try {
    addToCart.run(req.params.recipeId);
    res.json({ message: 'Recipe added to cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:recipeId', (req, res) => {
  try {
    const result = removeFromCart.run(req.params.recipeId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not in cart' });
    }
    res.json({ message: 'Recipe removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shopping list route
app.get('/api/shopping-list', (req, res) => {
  try {
    const shoppingList = getAggregatedShoppingList();
    res.json(shoppingList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ingredient routes
app.get('/api/ingredients', (req, res) => {
  try {
    const ingredients = getAllIngredients.all();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ingredients', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }

    const ingredient = getOrCreateIngredient(name.trim());
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/ingredients/:id', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }

    const existing = getIngredientById.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    updateIngredient.run({ id: req.params.id, name: name.trim() });
    const updated = getIngredientById.get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/ingredients/:id', (req, res) => {
  try {
    const result = deleteIngredient.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export route
app.get('/api/export', (req, res) => {
  try {
    const recipes = getAllRecipesWithIngredients();
    const ingredients = getAllIngredients.all();
    const exportData = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      ingredients: ingredients,
      recipes: recipes
    };
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import route
app.post('/api/import', (req, res) => {
  try {
    const { recipes, ingredients: importedIngredients, mode } = req.body;

    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({ error: 'Invalid import data: recipes array is required' });
    }

    if (mode !== 'add' && mode !== 'overwrite') {
      return res.status(400).json({ error: 'Invalid mode: must be "add" or "overwrite"' });
    }

    let imported = 0;
    let skipped = 0;

    // Overwrite mode: delete all existing recipes first
    if (mode === 'overwrite') {
      deleteAllRecipes();
    }

    // Import ingredients if provided (for v2.0 format)
    const ingredientNameToId = {};
    if (importedIngredients && Array.isArray(importedIngredients)) {
      for (const ing of importedIngredients) {
        if (ing.name) {
          const created = getOrCreateIngredient(ing.name);
          ingredientNameToId[ing.name.toLowerCase()] = created.id;
        }
      }
    }

    // Get existing recipe names to check for duplicates (only in add mode)
    const existingNames = mode === 'add'
      ? new Set(getAllRecipes.all().map(r => r.name.toLowerCase()))
      : new Set();

    // Import each recipe
    for (const recipe of recipes) {
      // Validate recipe structure
      if (!recipe.name || !recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        skipped++;
        continue;
      }

      // Skip duplicates in add mode
      if (mode === 'add' && existingNames.has(recipe.name.toLowerCase())) {
        skipped++;
        continue;
      }

      // Validate and convert ingredients
      const processedIngredients = [];
      let invalidIngredient = false;

      for (const ing of recipe.ingredients) {
        if (!ing.name || typeof ing.quantity !== 'number' || !ing.unit) {
          invalidIngredient = true;
          break;
        }

        // Get or create ingredient and map to ingredient_id
        const ingredient = getOrCreateIngredient(ing.name);
        processedIngredients.push({
          ingredient_id: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit
        });
      }

      if (invalidIngredient) {
        skipped++;
        continue;
      }

      // Import the recipe with ingredient IDs
      createRecipeWithIngredients({
        name: recipe.name,
        servings: recipe.servings || null,
        prep_time: recipe.prep_time || null,
        instructions: recipe.instructions || '',
        ingredients: processedIngredients
      });

      imported++;
    }

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      mode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe Shopper server running on port ${PORT}`);
});
