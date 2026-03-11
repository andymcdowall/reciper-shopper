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
  deleteIngredient,
  updateIngredientPreferredUnit,
  getAllUnits,
  getUnitById,
  getUnitByName,
  getOrCreateUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  getIngredientConversions,
  createIngredientConversion,
  deleteIngredientConversion
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

    // Validate that all ingredients have ingredient_id, quantity, and unit_id
    const validIngredients = ingredients.every(ing =>
      ing.ingredient_id && typeof ing.quantity === 'number' && ing.unit_id
    );

    if (!validIngredients) {
      return res.status(400).json({ error: 'Each ingredient must have ingredient_id, quantity, and unit_id' });
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

// Update ingredient preferred unit
app.put('/api/ingredients/:id/preferred-unit', (req, res) => {
  try {
    const { preferred_unit_id } = req.body;

    const existing = getIngredientById.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    updateIngredientPreferredUnit.run({ id: req.params.id, preferred_unit_id: preferred_unit_id || null });
    const updated = getIngredientById.get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ingredient conversion routes
app.get('/api/ingredients/:id/conversions', (req, res) => {
  try {
    const conversions = getIngredientConversions.all(req.params.id);
    res.json(conversions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ingredients/:id/conversions', (req, res) => {
  try {
    const { from_unit_id, to_unit_id, factor } = req.body;

    if (!from_unit_id || !to_unit_id || typeof factor !== 'number') {
      return res.status(400).json({ error: 'from_unit_id, to_unit_id, and factor are required' });
    }

    // Validate that both units are base units
    const fromUnit = getUnitById.get(from_unit_id);
    const toUnit = getUnitById.get(to_unit_id);

    if (!fromUnit || !toUnit) {
      return res.status(400).json({ error: 'Invalid unit IDs' });
    }

    if (fromUnit.base_unit_id !== null || toUnit.base_unit_id !== null) {
      return res.status(400).json({ error: 'Ingredient conversions must use base units only' });
    }

    const result = createIngredientConversion.run({
      ingredient_id: req.params.id,
      from_unit_id,
      to_unit_id,
      factor
    });

    const conversions = getIngredientConversions.all(req.params.id);
    const newConversion = conversions.find(c => c.id === result.lastInsertRowid);
    res.status(201).json(newConversion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/ingredients/:id/conversions/:conversionId', (req, res) => {
  try {
    const result = deleteIngredientConversion.run(req.params.conversionId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversion not found' });
    }
    res.json({ message: 'Conversion deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unit routes
app.get('/api/units', (req, res) => {
  try {
    const units = getAllUnits.all();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/units', (req, res) => {
  try {
    const { name, category, base_unit_id, to_base_factor } = req.body;

    if (!name || !name.trim() || !category) {
      return res.status(400).json({ error: 'Unit name and category are required' });
    }

    if (!['volume', 'mass', 'length', 'count'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be volume, mass, length, or count' });
    }

    // If base_unit_id is provided, to_base_factor is required
    if (base_unit_id && !to_base_factor) {
      return res.status(400).json({ error: 'to_base_factor is required when base_unit_id is provided' });
    }

    const { rounding_increment } = req.body;
    const result = createUnit.run({
      name: name.trim(),
      category,
      base_unit_id: base_unit_id || null,
      to_base_factor: to_base_factor || null,
      rounding_increment: rounding_increment || null
    });
    const unit = getUnitById.get(result.lastInsertRowid);
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/units/:id', (req, res) => {
  try {
    const { name, category, base_unit_id, to_base_factor, rounding_increment } = req.body;

    if (!name || !name.trim() || !category) {
      return res.status(400).json({ error: 'Unit name and category are required' });
    }

    const existing = getUnitById.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    updateUnit.run({
      id: req.params.id,
      name: name.trim(),
      category,
      base_unit_id: base_unit_id || null,
      to_base_factor: to_base_factor || null,
      rounding_increment: rounding_increment || null
    });

    const updated = getUnitById.get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/units/:id', (req, res) => {
  try {
    const result = deleteUnit.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export route
app.get('/api/export', (req, res) => {
  try {
    const recipes = getAllRecipesWithIngredients();
    const ingredients = getAllIngredients.all();
    const units = getAllUnits.all();

    // Get all ingredient conversions
    const allConversions = [];
    for (const ingredient of ingredients) {
      const conversions = getIngredientConversions.all(ingredient.id);
      allConversions.push(...conversions);
    }

    const exportData = {
      version: '3.0',
      exported_at: new Date().toISOString(),
      units: units,
      ingredients: ingredients,
      ingredient_conversions: allConversions,
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
    const { recipes, ingredients: importedIngredients, units: importedUnits, ingredient_conversions: importedConversions, mode } = req.body;

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

    // Import units if provided (for v3.0 format)
    const unitMap = {}; // old ID -> new ID or name -> new ID
    if (importedUnits && Array.isArray(importedUnits)) {
      // First pass: create base units (those without base_unit_id or base_unit_name)
      for (const unit of importedUnits) {
        const hasNoBaseUnit = (unit.base_unit_id === null || unit.base_unit_id === undefined) &&
                              (unit.base_unit_name === null || unit.base_unit_name === undefined);
        if (hasNoBaseUnit) {
          const created = getOrCreateUnit(unit.name, unit.category, null, null);
          if (unit.id !== undefined) {
            unitMap[unit.id] = created.id;
          }
          unitMap[unit.name.toLowerCase()] = created.id;
        }
      }

      // Second pass: create/update non-base units
      for (const unit of importedUnits) {
        const hasBaseUnit = (unit.base_unit_id !== null && unit.base_unit_id !== undefined) ||
                           (unit.base_unit_name !== null && unit.base_unit_name !== undefined);
        if (hasBaseUnit) {
          // Resolve base unit ID
          let newBaseUnitId;
          if (unit.base_unit_name) {
            newBaseUnitId = unitMap[unit.base_unit_name.toLowerCase()];
          } else if (unit.base_unit_id !== undefined && unit.base_unit_id !== null) {
            newBaseUnitId = unitMap[unit.base_unit_id];
          }

          if (newBaseUnitId) {
            // Check if unit already exists
            const existing = getUnitByName.get(unit.name);
            if (existing && existing.base_unit_id === null) {
              // Update existing unit to set base_unit_id and to_base_factor
              updateUnit.run({
                id: existing.id,
                name: unit.name,
                category: unit.category,
                base_unit_id: newBaseUnitId,
                to_base_factor: unit.to_base_factor
              });
              if (unit.id !== undefined) {
                unitMap[unit.id] = existing.id;
              }
              unitMap[unit.name.toLowerCase()] = existing.id;
            } else if (!existing) {
              const created = getOrCreateUnit(unit.name, unit.category, newBaseUnitId, unit.to_base_factor);
              if (unit.id !== undefined) {
                unitMap[unit.id] = created.id;
              }
              unitMap[unit.name.toLowerCase()] = created.id;
            }
          }
        }
      }
    }

    // Import ingredients if provided
    const ingredientMap = {}; // old ID -> new ID or name -> new ID
    if (importedIngredients && Array.isArray(importedIngredients)) {
      for (const ing of importedIngredients) {
        if (ing.name) {
          const created = getOrCreateIngredient(ing.name);
          if (ing.id !== undefined) {
            ingredientMap[ing.id] = created.id;
          }
          ingredientMap[ing.name.toLowerCase()] = created.id;

          // Set preferred unit if provided
          if (ing.preferred_unit_id !== undefined && ing.preferred_unit_id !== null) {
            const newPreferredUnitId = unitMap[ing.preferred_unit_id];
            if (newPreferredUnitId) {
              updateIngredientPreferredUnit.run({ id: created.id, preferred_unit_id: newPreferredUnitId });
            }
          } else if (ing.preferred_unit_name) {
            const newPreferredUnitId = unitMap[ing.preferred_unit_name.toLowerCase()];
            if (newPreferredUnitId) {
              updateIngredientPreferredUnit.run({ id: created.id, preferred_unit_id: newPreferredUnitId });
            }
          }
        }
      }
    }

    // Import ingredient conversions if provided (for v3.0 format)
    if (importedConversions && Array.isArray(importedConversions)) {
      for (const conv of importedConversions) {
        const newIngredientId = conv.ingredient_id !== undefined
          ? ingredientMap[conv.ingredient_id]
          : (conv.ingredient_name ? ingredientMap[conv.ingredient_name.toLowerCase()] : null);

        const newFromUnitId = conv.from_unit_id !== undefined
          ? unitMap[conv.from_unit_id]
          : (conv.from_unit_name ? unitMap[conv.from_unit_name.toLowerCase()] : null);

        const newToUnitId = conv.to_unit_id !== undefined
          ? unitMap[conv.to_unit_id]
          : (conv.to_unit_name ? unitMap[conv.to_unit_name.toLowerCase()] : null);

        if (newIngredientId && newFromUnitId && newToUnitId && conv.factor) {
          try {
            createIngredientConversion.run({
              ingredient_id: newIngredientId,
              from_unit_id: newFromUnitId,
              to_unit_id: newToUnitId,
              factor: conv.factor
            });
          } catch (error) {
            // Ignore duplicate conversions
            console.log(`Skipping duplicate conversion for ingredient ${newIngredientId}`);
          }
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

        // Get or create unit (use name from recipe ingredient)
        let unit_id;
        if (ing.unit_id !== undefined) {
          unit_id = unitMap[ing.unit_id];
        }
        if (!unit_id) {
          // Try to find unit by name
          unit_id = unitMap[ing.unit.toLowerCase()];
        }

        // If unit still not found, create a default unit (count category)
        if (!unit_id) {
          const created = getOrCreateUnit(ing.unit, 'count', null, null);
          unit_id = created.id;
          unitMap[ing.unit.toLowerCase()] = unit_id;
        }

        processedIngredients.push({
          ingredient_id: ingredient.id,
          quantity: ing.quantity,
          unit_id: unit_id
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
