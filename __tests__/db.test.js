/**
 * @jest-environment node
 */
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

  // Initialize schema with new structure
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
});

afterEach(() => {
  // Close and delete test database
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('Database - Ingredient Operations', () => {
  test('should create an ingredient', () => {
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);

    const result = createIngredient.run({ name: 'flour' });
    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(result.lastInsertRowid);

    expect(ingredient).toMatchObject({
      name: 'flour'
    });
  });

  test('should not allow duplicate ingredient names (case-insensitive)', () => {
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);

    createIngredient.run({ name: 'Flour' });

    expect(() => {
      createIngredient.run({ name: 'flour' });
    }).toThrow();
  });

  test('should update an ingredient name', () => {
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);

    const result = createIngredient.run({ name: 'flour' });
    const ingredientId = result.lastInsertRowid;

    const updateIngredient = db.prepare(`
      UPDATE ingredients SET name = @name WHERE id = @id
    `);

    updateIngredient.run({ id: ingredientId, name: 'whole wheat flour' });

    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredientId);
    expect(ingredient.name).toBe('whole wheat flour');
  });

  test('should delete an ingredient', () => {
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);

    const result = createIngredient.run({ name: 'flour' });
    const ingredientId = result.lastInsertRowid;

    db.prepare('DELETE FROM ingredients WHERE id = ?').run(ingredientId);

    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredientId);
    expect(ingredient).toBeUndefined();
  });
});

describe('Database - Recipe Operations', () => {
  test('should create a recipe with ingredients', () => {
    // First create ingredients
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);

    const flour = createIngredient.run({ name: 'flour' });
    const flourId = flour.lastInsertRowid;

    // Create recipe
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);

    const result = createRecipe.run({
      name: 'Test Recipe',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });

    const recipeId = result.lastInsertRowid;

    // Link ingredient to recipe
    const createRecipeIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (@recipe_id, @ingredient_id, @quantity, @unit)
    `);

    createRecipeIngredient.run({
      recipe_id: recipeId,
      ingredient_id: flourId,
      quantity: 2,
      unit: 'cups'
    });

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const recipeIngredients = db.prepare(`
      SELECT i.name, ri.quantity, ri.unit
      FROM ingredients i
      INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?
    `).all(recipeId);

    expect(recipe).toMatchObject({
      name: 'Test Recipe',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });
    expect(recipeIngredients).toHaveLength(1);
    expect(recipeIngredients[0]).toMatchObject({
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
    expect(recipes[0].name).toBe('Recipe 2');
    expect(recipes[1].name).toBe('Recipe 1');
  });

  test('should delete a recipe and its recipe_ingredients', () => {
    // Create ingredient
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);
    const flour = createIngredient.run({ name: 'flour' });

    // Create recipe
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);
    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    // Link ingredient
    db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `).run(recipeId, flour.lastInsertRowid, 2, 'cups');

    // Delete the recipe
    db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    const recipeIngredients = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ?').all(recipeId);

    expect(recipe).toBeUndefined();
    expect(recipeIngredients).toHaveLength(0);
  });

  test('should update ingredient name and reflect in all recipes', () => {
    // Create ingredient
    const createIngredient = db.prepare(`
      INSERT INTO ingredients (name) VALUES (@name)
    `);
    const flour = createIngredient.run({ name: 'flour' });
    const flourId = flour.lastInsertRowid;

    // Create recipe
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);
    const result = createRecipe.run({ name: 'Test Recipe', servings: 4, prep_time: 30, instructions: '' });
    const recipeId = result.lastInsertRowid;

    // Link ingredient
    db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `).run(recipeId, flourId, 2, 'cups');

    // Update ingredient name
    db.prepare('UPDATE ingredients SET name = ? WHERE id = ?').run('whole wheat flour', flourId);

    // Check recipe still has updated ingredient
    const recipeIngredients = db.prepare(`
      SELECT i.name, ri.quantity, ri.unit
      FROM ingredients i
      INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?
    `).all(recipeId);

    expect(recipeIngredients[0].name).toBe('whole wheat flour');
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
    // Create ingredients
    const createIngredient = db.prepare('INSERT INTO ingredients (name) VALUES (?)');
    const flourId = createIngredient.run('flour').lastInsertRowid;
    const sugarId = createIngredient.run('sugar').lastInsertRowid;

    // Create recipes
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);
    const recipe1 = createRecipe.run({ name: 'Recipe 1', servings: 4, prep_time: 30, instructions: '' });
    const recipe2 = createRecipe.run({ name: 'Recipe 2', servings: 2, prep_time: 15, instructions: '' });

    // Link ingredients to recipes
    const createRecipeIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `);
    createRecipeIngredient.run(recipe1.lastInsertRowid, flourId, 2, 'cups');
    createRecipeIngredient.run(recipe2.lastInsertRowid, flourId, 1, 'cups');
    createRecipeIngredient.run(recipe1.lastInsertRowid, sugarId, 1, 'cup');

    // Add to cart
    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipe1.lastInsertRowid);
    db.prepare('INSERT INTO cart (recipe_id) VALUES (?)').run(recipe2.lastInsertRowid);

    // Get shopping list
    const items = db.prepare(`
      SELECT i.name, ri.quantity, ri.unit
      FROM ingredients i
      INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      INNER JOIN cart c ON ri.recipe_id = c.recipe_id
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
    // Create ingredient
    const createIngredient = db.prepare('INSERT INTO ingredients (name) VALUES (?)');
    const flourId = createIngredient.run('flour').lastInsertRowid;

    // Create recipe
    const createRecipe = db.prepare(`
      INSERT INTO recipes (name, servings, prep_time, instructions)
      VALUES (@name, @servings, @prep_time, @instructions)
    `);
    const recipe1 = createRecipe.run({
      name: 'Recipe 1',
      servings: 4,
      prep_time: 30,
      instructions: 'Test instructions'
    });

    // Link ingredient
    db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `).run(recipe1.lastInsertRowid, flourId, 2, 'cups');

    // Export logic
    const recipes = db.prepare('SELECT * FROM recipes').all();
    const exported = recipes.map(recipe => {
      const ingredients = db.prepare(`
        SELECT i.name, ri.quantity, ri.unit
        FROM ingredients i
        INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ?
      `).all(recipe.id);
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
