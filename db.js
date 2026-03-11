const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'recipes.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    servings INTEGER,
    prep_time INTEGER,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category TEXT NOT NULL CHECK(category IN ('volume', 'mass', 'length', 'count')),
    base_unit_id INTEGER,
    to_base_factor REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    preferred_unit_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_unit_id) REFERENCES units(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ingredient_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    from_unit_id INTEGER NOT NULL,
    to_unit_id INTEGER NOT NULL,
    factor REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (from_unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (to_unit_id) REFERENCES units(id) ON DELETE CASCADE,
    UNIQUE(ingredient_id, from_unit_id, to_unit_id)
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_id INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );
`);

// Migrations
try {
  db.exec(`ALTER TABLE units ADD COLUMN rounding_increment REAL`);
} catch (e) {
  // Column already exists
}

// Recipe queries
const getAllRecipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC');

const getRecipeById = db.prepare('SELECT * FROM recipes WHERE id = ?');

const getIngredientsByRecipeId = db.prepare(`
  SELECT i.id, i.name, ri.quantity, ri.unit_id, u.name as unit
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
  INNER JOIN units u ON ri.unit_id = u.id
  WHERE ri.recipe_id = ?
`);

const createRecipe = db.prepare(`
  INSERT INTO recipes (name, servings, prep_time, instructions)
  VALUES (@name, @servings, @prep_time, @instructions)
`);

const createRecipeIngredient = db.prepare(`
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id)
  VALUES (@recipe_id, @ingredient_id, @quantity, @unit_id)
`);

const deleteRecipe = db.prepare('DELETE FROM recipes WHERE id = ?');

// Ingredient queries
const getAllIngredients = db.prepare('SELECT * FROM ingredients ORDER BY name ASC');

const getIngredientById = db.prepare('SELECT * FROM ingredients WHERE id = ?');

const getIngredientByName = db.prepare('SELECT * FROM ingredients WHERE name = ? COLLATE NOCASE');

const createIngredient = db.prepare(`
  INSERT INTO ingredients (name)
  VALUES (@name)
`);

const updateIngredient = db.prepare(`
  UPDATE ingredients SET name = @name WHERE id = @id
`);

const deleteIngredient = db.prepare('DELETE FROM ingredients WHERE id = ?');

const updateIngredientPreferredUnit = db.prepare(`
  UPDATE ingredients SET preferred_unit_id = @preferred_unit_id WHERE id = @id
`);

// Unit queries
const getAllUnits = db.prepare('SELECT * FROM units ORDER BY category, name ASC');

const getUnitById = db.prepare('SELECT * FROM units WHERE id = ?');

const getUnitByName = db.prepare('SELECT * FROM units WHERE name = ? COLLATE NOCASE');

const getUnitsByCategory = db.prepare('SELECT * FROM units WHERE category = ? ORDER BY name ASC');

const getBaseUnits = db.prepare('SELECT * FROM units WHERE base_unit_id IS NULL ORDER BY category ASC');

const createUnit = db.prepare(`
  INSERT INTO units (name, category, base_unit_id, to_base_factor, rounding_increment)
  VALUES (@name, @category, @base_unit_id, @to_base_factor, @rounding_increment)
`);

const updateUnit = db.prepare(`
  UPDATE units SET name = @name, category = @category, base_unit_id = @base_unit_id, to_base_factor = @to_base_factor, rounding_increment = @rounding_increment
  WHERE id = @id
`);

const deleteUnit = db.prepare('DELETE FROM units WHERE id = ?');

// Ingredient conversion queries
const getIngredientConversions = db.prepare(`
  SELECT ic.*, u1.name as from_unit_name, u2.name as to_unit_name
  FROM ingredient_conversions ic
  INNER JOIN units u1 ON ic.from_unit_id = u1.id
  INNER JOIN units u2 ON ic.to_unit_id = u2.id
  WHERE ic.ingredient_id = ?
`);

const createIngredientConversion = db.prepare(`
  INSERT INTO ingredient_conversions (ingredient_id, from_unit_id, to_unit_id, factor)
  VALUES (@ingredient_id, @from_unit_id, @to_unit_id, @factor)
`);

const deleteIngredientConversion = db.prepare('DELETE FROM ingredient_conversions WHERE id = ?');

// Cart queries
const getCartRecipeIds = db.prepare('SELECT recipe_id FROM cart');

const addToCart = db.prepare('INSERT OR IGNORE INTO cart (recipe_id) VALUES (?)');

const removeFromCart = db.prepare('DELETE FROM cart WHERE recipe_id = ?');

const getCartRecipes = db.prepare(`
  SELECT r.* FROM recipes r
  INNER JOIN cart c ON r.id = c.recipe_id
  ORDER BY c.added_at DESC
`);

const getShoppingList = db.prepare(`
  SELECT i.id as ingredient_id, i.name, i.preferred_unit_id, ri.quantity, ri.unit_id, u.name as unit, u.category
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
  INNER JOIN units u ON ri.unit_id = u.id
  INNER JOIN cart c ON ri.recipe_id = c.recipe_id
  ORDER BY i.name
`);

// Helper functions
function getRecipeWithIngredients(id) {
  const recipe = getRecipeById.get(id);
  if (!recipe) return null;
  recipe.ingredients = getIngredientsByRecipeId.all(id);
  return recipe;
}

function createRecipeWithIngredients(recipeData) {
  const transaction = db.transaction((data) => {
    const result = createRecipe.run(data);
    const recipeId = result.lastInsertRowid;

    for (const ingredient of data.ingredients) {
      // ingredient should now have ingredient_id, quantity, and unit_id
      createRecipeIngredient.run({
        recipe_id: recipeId,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit_id: ingredient.unit_id
      });
    }

    return recipeId;
  });

  return transaction(recipeData);
}

// Ingredient helper functions
function getOrCreateIngredient(name) {
  let ingredient = getIngredientByName.get(name);
  if (!ingredient) {
    const result = createIngredient.run({ name });
    ingredient = getIngredientById.get(result.lastInsertRowid);
  }
  return ingredient;
}

// Unit helper functions
function getOrCreateUnit(name, category, base_unit_id, to_base_factor) {
  let unit = getUnitByName.get(name);
  if (!unit) {
    const result = createUnit.run({
      name,
      category,
      base_unit_id: base_unit_id || null,
      to_base_factor: to_base_factor || null,
      rounding_increment: null
    });
    unit = getUnitById.get(result.lastInsertRowid);
  }
  return unit;
}

// Unit conversion function
function convertUnits(fromUnitId, toUnitId, quantity, ingredientId = null) {
  if (fromUnitId === toUnitId) {
    return quantity;
  }

  const fromUnit = getUnitById.get(fromUnitId);
  const toUnit = getUnitById.get(toUnitId);

  if (!fromUnit || !toUnit) {
    throw new Error('Invalid unit IDs');
  }

  // Check for ingredient-specific conversion first
  if (ingredientId) {
    const conversions = getIngredientConversions.all(ingredientId);

    // Direct conversion
    const directConversion = conversions.find(c =>
      c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId
    );
    if (directConversion) {
      return quantity * directConversion.factor;
    }

    // Reverse conversion
    const reverseConversion = conversions.find(c =>
      c.from_unit_id === toUnitId && c.to_unit_id === fromUnitId
    );
    if (reverseConversion) {
      return quantity / reverseConversion.factor;
    }

    // Try chained conversion via ingredient-specific conversion + natural conversion
    // e.g., g → ml (ingredient) → tbsp (natural)
    if (fromUnit.category !== toUnit.category) {
      for (const conv of conversions) {
        // Try fromUnit → intermediate → toUnit
        if (conv.from_unit_id === fromUnitId) {
          const intermediateUnit = getUnitById.get(conv.to_unit_id);
          if (intermediateUnit && intermediateUnit.category === toUnit.category) {
            try {
              const intermediateQuantity = quantity * conv.factor;
              return convertUnits(conv.to_unit_id, toUnitId, intermediateQuantity, null); // No ingredient for natural conversion
            } catch (e) {
              // Try next conversion
            }
          }
        }
        // Try fromUnit → intermediate (reverse) → toUnit
        if (conv.to_unit_id === fromUnitId) {
          const intermediateUnit = getUnitById.get(conv.from_unit_id);
          if (intermediateUnit && intermediateUnit.category === toUnit.category) {
            try {
              const intermediateQuantity = quantity / conv.factor;
              return convertUnits(conv.from_unit_id, toUnitId, intermediateQuantity, null);
            } catch (e) {
              // Try next conversion
            }
          }
        }
      }
    }
  }

  // Natural conversion (via base units)
  if (fromUnit.category !== toUnit.category) {
    throw new Error(`Cannot convert between ${fromUnit.category} and ${toUnit.category} without ingredient-specific conversion`);
  }

  // Convert to base unit
  let baseQuantity = quantity;
  if (fromUnit.base_unit_id !== null) {
    baseQuantity = quantity * fromUnit.to_base_factor;
  }

  // Convert from base unit to target unit
  if (toUnit.base_unit_id !== null) {
    return baseQuantity / toUnit.to_base_factor;
  }

  return baseQuantity;
}

function getAggregatedShoppingList() {
  const items = getShoppingList.all();
  const aggregated = {};

  for (const item of items) {
    const key = item.ingredient_id;

    if (!aggregated[key]) {
      aggregated[key] = {
        ingredient_id: item.ingredient_id,
        name: item.name,
        preferred_unit_id: item.preferred_unit_id,
        items: []
      };
    }

    aggregated[key].items.push({
      quantity: item.quantity,
      unit_id: item.unit_id
    });
  }

  // Convert and aggregate
  const result = [];
  for (const key in aggregated) {
    const group = aggregated[key];
    let targetUnitId = group.preferred_unit_id;

    // If no preferred unit, use the first unit encountered
    if (!targetUnitId && group.items.length > 0) {
      targetUnitId = group.items[0].unit_id;
    }

    if (!targetUnitId) continue;

    let totalQuantity = 0;
    for (const item of group.items) {
      try {
        const converted = convertUnits(item.unit_id, targetUnitId, item.quantity, group.ingredient_id);
        totalQuantity += converted;
      } catch (error) {
        // If conversion fails, skip this item or add separately
        console.error(`Conversion error for ${group.name}: ${error.message}`);
        // For now, if no conversion possible, just add the original quantity if same unit
        if (item.unit_id === targetUnitId) {
          totalQuantity += item.quantity;
        }
      }
    }

    const targetUnit = getUnitById.get(targetUnitId);
    if (targetUnit) {
      let displayQuantity = totalQuantity;
      if (targetUnit.rounding_increment && targetUnit.rounding_increment > 0) {
        displayQuantity = Math.round(totalQuantity / targetUnit.rounding_increment) * targetUnit.rounding_increment;
        // Fix floating-point precision (e.g. 0.25 increments)
        const precision = (targetUnit.rounding_increment.toString().split('.')[1] || '').length;
        displayQuantity = parseFloat(displayQuantity.toFixed(precision + 2));
      }
      result.push({
        name: group.name,
        quantity: displayQuantity,
        unit: targetUnit.name
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function getAllRecipesWithIngredients() {
  const recipes = getAllRecipes.all();
  return recipes.map(recipe => {
    const ingredients = getIngredientsByRecipeId.all(recipe.id);
    return {
      name: recipe.name,
      servings: recipe.servings,
      prep_time: recipe.prep_time,
      instructions: recipe.instructions,
      ingredients: ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      }))
    };
  });
}

function deleteAllRecipes() {
  db.prepare('DELETE FROM recipes').run();
}

module.exports = {
  db,
  getAllRecipes,
  getRecipeById,
  getRecipeWithIngredients,
  createRecipeWithIngredients,
  deleteRecipe,
  getCartRecipeIds,
  getCartRecipes,
  addToCart,
  removeFromCart,
  getAggregatedShoppingList,
  getAllRecipesWithIngredients,
  deleteAllRecipes,
  // Ingredient exports
  getAllIngredients,
  getIngredientById,
  getIngredientByName,
  getOrCreateIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  updateIngredientPreferredUnit,
  // Unit exports
  getAllUnits,
  getUnitById,
  getUnitByName,
  getUnitsByCategory,
  getBaseUnits,
  getOrCreateUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  convertUnits,
  // Ingredient conversion exports
  getIngredientConversions,
  createIngredientConversion,
  deleteIngredientConversion
};
