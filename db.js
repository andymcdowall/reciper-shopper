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

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );
`);

// Recipe queries
const getAllRecipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC');

const getRecipeById = db.prepare('SELECT * FROM recipes WHERE id = ?');

const getIngredientsByRecipeId = db.prepare(`
  SELECT i.id, i.name, ri.quantity, ri.unit
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = ?
`);

const createRecipe = db.prepare(`
  INSERT INTO recipes (name, servings, prep_time, instructions)
  VALUES (@name, @servings, @prep_time, @instructions)
`);

const createRecipeIngredient = db.prepare(`
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  VALUES (@recipe_id, @ingredient_id, @quantity, @unit)
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
  SELECT i.name, ri.quantity, ri.unit
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
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
      // ingredient should now have ingredient_id, quantity, and unit
      createRecipeIngredient.run({
        recipe_id: recipeId,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit: ingredient.unit
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

function getAggregatedShoppingList() {
  const items = getShoppingList.all();
  const aggregated = {};

  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
    if (aggregated[key]) {
      aggregated[key].quantity += item.quantity;
    } else {
      aggregated[key] = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      };
    }
  }

  return Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
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
  deleteIngredient
};
