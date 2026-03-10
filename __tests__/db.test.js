const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a test database module
let db;
let testDbPath;

beforeEach(() => {
  // Create a temporary test database
  testDbPath = path.join(__dirname, 'test.db');
  db = new Database(testDbPath);

  // Initialize schema
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
});

afterEach(() => {
  // Close and delete test database
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('Database - Recipe Operations', () => {
  test('should create a recipe with ingredients', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const createIngredient = db.prepare(`
      INSERT INTO ingredients (recipe_id, name, quantity, unit)
      VALUES (@recipe_id, @name, @quantity, @unit)
    `);

    const result = createRecipe.run({
      name: 'Test Recipe',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });

    const recipeId = result.lastInsertRowid;

    createIngredient.run({
      recipe_id: recipeId,
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const ingredients = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ?').all(recipeId);

    expect(recipe).toMatchObject({
      name: 'Test Recipe',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });
    expect(ingredients).toHaveLength(1);
    expect(ingredients[0]).toMatchObject({
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });
  });

  test('should retrieve all recipes', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    createRecipe.run({ name: 'Recipe 1', servings: 2, prep_time: 15, instructions: '' });
    createRecipe.run({ name: 'Recipe 2', servings: 4, prep_time: 30, instructions: '' });

    const recipes = db.prepare('SELECT * FROM recipes ORDER BY id DESC').all();

    expect(recipes).toHaveLength(2);
    // Most recent recipe (by ID) should be first (DESC order)
    expect(recipes[0].name).toBe('Recipe 2');
    expect(recipes[1].name).toBe('Recipe 1');
  });

  test('should delete a recipe and its ingredients', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const createIngredient = db.prepare(`
      INSERT INTO ingredients (recipe_id, name, quantity, unit)
      VALUES (@recipe_id, @name, @quantity, @unit)
    `);

    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    createIngredient.run({ recipe_id: recipeId, name: 'flour', quantity: 2, unit: 'cups' });

    // Delete the recipe
    db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const ingredients = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ?').all(recipeId);

    expect(recipe).toBeUndefined();
    expect(ingredients).toHaveLength(0);
  });

  test('should delete all recipes', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    createRecipe.run({ name: 'Recipe 1', servings: 2, prep_time: 15, instructions: '' });
    createRecipe.run({ name: 'Recipe 2', servings: 4, prep_time: 30, instructions: '' });

    db.prepare('DELETE FROM recipes').run();

    const recipes = db.prepare('SELECT * FROM recipes').all();
    expect(recipes).toHaveLength(0);
  });
});

describe('Database - Cart Operations', () => {
  test('should add a recipe to cart', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    const addToCart = db.prepare('INSERT OR IGNORE INTO cart (recipe_id) VALUES (?)');
    addToCart.run(recipeId);

    const cartItems = db.prepare('SELECT * FROM cart').all();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].recipe_id).toBe(recipeId);
  });

  test('should not add duplicate recipes to cart', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    const addToCart = db.prepare('INSERT OR IGNORE INTO cart (recipe_id) VALUES (?)');
    addToCart.run(recipeId);
    addToCart.run(recipeId);

    const cartItems = db.prepare('SELECT * FROM cart').all();
    expect(cartItems).toHaveLength(1);
  });

  test('should remove a recipe from cart', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipeId);
    db.prepare('DELETE FROM cart WHERE recipe_id = ?').run(recipeId);

    const cartItems = db.prepare('SELECT * FROM cart').all();
    expect(cartItems).toHaveLength(0);
  });

  test('should get cart recipes with details', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipeId);

    const cartRecipes = db.prepare(`
      SELECT r.* FROM recipes r
      INNER JOIN cart c ON r.id = c.recipe_id
      ORDER BY c.added_at DESC
    `).all();

    expect(cartRecipes).toHaveLength(1);
    expect(cartRecipes[0].name).toBe('Test Recipe');
  });
});

describe('Database - Shopping List Operations', () => {
  test('should aggregate ingredients from cart recipes', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const createIngredient = db.prepare(`
      INSERT INTO ingredients (recipe_id, name, quantity, unit)
      VALUES (@recipe_id, @name, @quantity, @unit)
    `);

    // Create two recipes
    const recipe1 = createRecipe.run({ name: 'Recipe 1', servings: 4, prep_time: 30, instructions: '' });
    const recipe2 = createRecipe.run({ name: 'Recipe 2', servings: 2, prep_time: 15, instructions: '' });

    // Add ingredients
    createIngredient.run({ recipe_id: recipe1.lastInsertRowid, name: 'flour', quantity: 2, unit: 'cups' });
    createIngredient.run({ recipe_id: recipe2.lastInsertRowid, name: 'flour', quantity: 1, unit: 'cups' });
    createIngredient.run({ recipe_id: recipe1.lastInsertRowid, name: 'sugar', quantity: 1, unit: 'cup' });

    // Add to cart
    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipe1.lastInsertRowid);
    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipe2.lastInsertRowid);

    // Get shopping list
    const items = db.prepare(`
      SELECT i.name, i.quantity, i.unit
      FROM ingredients i
      INNER JOIN cart c ON i.recipe_id = c.recipe_id
      ORDER BY i.name
    `).all();

    expect(items).toHaveLength(3);

    // Aggregate manually for testing
    const aggregated = {};
    for (const item of items) {
      const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
      if (aggregated[key]) {
        aggregated[key].quantity += item.quantity;
      } else {
        aggregated[key] = { name: item.name, quantity: item.quantity, unit: item.unit };
      }
    }

    const result = Object.values(aggregated);
    expect(result).toHaveLength(2);

    const flour = result.find(i => i.name === 'flour');
    const sugar = result.find(i => i.name === 'sugar');

    expect(flour.quantity).toBe(3);
    expect(sugar.quantity).toBe(1);
  });
});

describe('Database - Export Operations', () => {
  test('should export all recipes with ingredients', () => {
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const createIngredient = db.prepare(`
      INSERT INTO ingredients (recipe_id, name, quantity, unit)
      VALUES (@recipe_id, @name, @quantity, @unit)
    `);

    const recipe1 = createRecipe.run({
      name: 'Recipe 1',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });

    createIngredient.run({
      recipe_id: recipe1.lastInsertRowid,
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });

    // Export logic
    const recipes = db.prepare('SELECT * FROM recipes').all();
    const exported = recipes.map(recipe => {
      const ingredients = db.prepare('SELECT * FROM ingredients WHERE recipe_id = ?').all(recipe.id);
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

    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe('Recipe 1');
    expect(exported[0].ingredients).toHaveLength(1);
    expect(exported[0].ingredients[0]).toMatchObject({
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });
  });
});
