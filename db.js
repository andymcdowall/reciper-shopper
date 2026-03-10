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
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
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

const getIngredientsByRecipeId = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ?');

const createRecipe = db.prepare(`
  INSERT INTO recipes (name, servings, prep_time, instructions)
  VALUES (@name, @servings, @prep_time, @instructions)
`);

const createIngredient = db.prepare(`
  INSERT INTO ingredients (recipe_id, name, quantity, unit)
  VALUES (@recipe_id, @name, @quantity, @unit)
`);

const deleteRecipe = db.prepare('DELETE FROM recipes WHERE id = ?');

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
  SELECT i.name, i.quantity, i.unit
  FROM ingredients i
  INNER JOIN cart c ON i.recipe_id = c.recipe_id
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
      createIngredient.run({
        recipe_id: recipeId,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      });
    }

    return recipeId;
  });

  return transaction(recipeData);
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
  getAggregatedShoppingList
};
