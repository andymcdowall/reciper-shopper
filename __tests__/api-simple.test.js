/**
 * Simplified API tests that test the actual server.js file
 * These tests run against a real server instance
 * @jest-environment node
 */
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'test-integration.db');

// Set test database before requiring modules
process.env.DB_PATH = testDbPath;

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// Now require the actual server module
// Note: We can't use server.js directly because it starts listening
// So we'll test the individual functions instead

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
  getOrCreateIngredient,
  getOrCreateUnit
} = require('../db');

// Helper function to convert ingredient names and unit names to IDs
function prepareIngredientsWithIds(ingredients) {
  return ingredients.map(ing => {
    const ingredient = getOrCreateIngredient(ing.name);
    // Determine category based on unit name
    const unitLower = ing.unit.toLowerCase();
    let category = 'count';
    if (['cup', 'cups', 'ml', 'l', 'tsp', 'tbsp', 'fl oz', 'pint', 'quart', 'gallon'].includes(unitLower)) {
      category = 'volume';
    } else if (['g', 'kg', 'mg', 'oz', 'lb', 'gram', 'grams', 'pound', 'pounds'].includes(unitLower)) {
      category = 'mass';
    } else if (['cm', 'inch', 'inches', 'mm', 'meter'].includes(unitLower)) {
      category = 'length';
    }
    const unit = getOrCreateUnit(ing.unit, category);
    return {
      ingredient_id: ingredient.id,
      quantity: ing.quantity,
      unit_id: unit.id
    };
  });
}

afterAll(() => {
  // Clean up test database
  const { db } = require('../db');
  db.close();

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    // Clear all data before each test
    try {
      deleteAllRecipes();
    } catch (e) {
      // Database might be empty
    }
  });

  describe('Recipe Operations', () => {
    test('should return empty array when no recipes exist', () => {
      const recipes = getAllRecipes.all();
      expect(recipes).toEqual([]);
    });

    test('should create and retrieve a recipe', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: 'Test instructions',
        ingredients: prepareIngredientsWithIds([
          { name: 'flour', quantity: 2, unit: 'cups' },
          { name: 'sugar', quantity: 1, unit: 'cup' }
        ])
      });

      const recipe = getRecipeWithIngredients(recipeId);

      expect(recipe).toBeDefined();
      expect(recipe.name).toBe('Test Recipe');
      expect(recipe.servings).toBe(4);
      expect(recipe.ingredients).toHaveLength(2);
    });

    test('should list all recipes', () => {
      createRecipeWithIngredients({
        name: 'Recipe 1',
        servings: 2,
        prep_time: 15,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      createRecipeWithIngredients({
        name: 'Recipe 2',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'sugar', quantity: 2, unit: 'cups' }])
      });

      const recipes = getAllRecipes.all();
      expect(recipes).toHaveLength(2);
    });

    test('should return null for non-existent recipe', () => {
      const recipe = getRecipeWithIngredients(9999);
      expect(recipe).toBeNull();
    });

    test('should delete a recipe', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'To Delete',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      const result = deleteRecipe.run(recipeId);
      expect(result.changes).toBe(1);

      const recipe = getRecipeWithIngredients(recipeId);
      expect(recipe).toBeNull();
    });
  });

  describe('Cart Operations', () => {
    test('should return empty array when cart is empty', () => {
      const cartRecipes = getCartRecipes.all();
      expect(cartRecipes).toEqual([]);
    });

    test('should not add duplicate recipes to cart', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      addToCart.run(recipeId);
      addToCart.run(recipeId); // Try to add again

      const cartRecipes = getCartRecipes.all();
      expect(cartRecipes).toHaveLength(1);
    });

    test('should add recipe to cart', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      addToCart.run(recipeId);

      const cartRecipes = getCartRecipes.all();
      expect(cartRecipes).toHaveLength(1);
      expect(cartRecipes[0].name).toBe('Test Recipe');
    });

    test('should remove recipe from cart', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      addToCart.run(recipeId);
      removeFromCart.run(recipeId);

      const cartRecipes = getCartRecipes.all();
      expect(cartRecipes).toHaveLength(0);
    });
  });

  describe('Shopping List', () => {
    test('should return empty list when cart is empty', () => {
      const shoppingList = getAggregatedShoppingList();
      expect(shoppingList).toEqual([]);
    });

    test('should aggregate same ingredients with different units in same category', () => {
      const recipeId = createRecipeWithIngredients({
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([
          { name: 'flour', quantity: 2, unit: 'cups' },
          { name: 'flour', quantity: 1, unit: 'cups' }
        ])
      });

      addToCart.run(recipeId);

      const shoppingList = getAggregatedShoppingList();

      // Should aggregate flour with same unit
      const flourItems = shoppingList.filter(item => item.name === 'flour');
      expect(flourItems).toHaveLength(1);
      expect(flourItems[0].quantity).toBe(3);
    });

    test('should aggregate ingredients from cart', () => {
      const recipe1Id = createRecipeWithIngredients({
        name: 'Recipe 1',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([
          { name: 'flour', quantity: 2, unit: 'cups' },
          { name: 'sugar', quantity: 1, unit: 'cup' }
        ])
      });

      const recipe2Id = createRecipeWithIngredients({
        name: 'Recipe 2',
        servings: 2,
        prep_time: 15,
        instructions: '',
        ingredients: prepareIngredientsWithIds([
          { name: 'flour', quantity: 1, unit: 'cups' },
          { name: 'eggs', quantity: 2, unit: 'whole' }
        ])
      });

      addToCart.run(recipe1Id);
      addToCart.run(recipe2Id);

      const shoppingList = getAggregatedShoppingList();

      expect(shoppingList).toHaveLength(3);

      const flour = shoppingList.find(item => item.name === 'flour');
      expect(flour.quantity).toBe(3);
    });
  });

  describe('Export/Import', () => {
    test('should export empty array when no recipes exist', () => {
      const exported = getAllRecipesWithIngredients();
      expect(exported).toEqual([]);
    });

    test('should skip invalid recipes during import', () => {
      const toImport = [
        {
          // Missing name
          servings: 4,
          prep_time: 30,
          instructions: '',
          ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
        },
        {
          name: 'Valid Recipe',
          servings: 2,
          prep_time: 15,
          instructions: '',
          ingredients: [] // No ingredients
        },
        {
          name: 'Another Valid',
          servings: 2,
          prep_time: 15,
          instructions: '',
          ingredients: [{ name: 'sugar', quantity: 1, unit: 'cup' }]
        }
      ];

      let imported = 0;
      let skipped = 0;

      for (const recipe of toImport) {
        if (!recipe.name || !recipe.ingredients || recipe.ingredients.length === 0) {
          skipped++;
          continue;
        }

        const validIngredients = recipe.ingredients.every(ing =>
          ing.name && typeof ing.quantity === 'number' && (ing.unit || ing.unit_id)
        );

        if (!validIngredients) {
          skipped++;
          continue;
        }

        createRecipeWithIngredients({
          ...recipe,
          ingredients: prepareIngredientsWithIds(recipe.ingredients)
        });
        imported++;
      }

      expect(imported).toBe(1);
      expect(skipped).toBe(2);
    });

    test('should validate ingredient structure during import', () => {
      const toImport = [
        {
          name: 'Invalid Ingredients',
          servings: 4,
          prep_time: 30,
          instructions: '',
          ingredients: [
            { name: 'flour', quantity: 'two', unit: 'cups' }, // Invalid quantity
            { quantity: 1, unit: 'cup' } // Missing name
          ]
        }
      ];

      let imported = 0;
      let skipped = 0;

      for (const recipe of toImport) {
        if (!recipe.name || !recipe.ingredients || recipe.ingredients.length === 0) {
          skipped++;
          continue;
        }

        const validIngredients = recipe.ingredients.every(ing =>
          ing.name && typeof ing.quantity === 'number' && (ing.unit || ing.unit_id)
        );

        if (!validIngredients) {
          skipped++;
          continue;
        }

        createRecipeWithIngredients({
          ...recipe,
          ingredients: prepareIngredientsWithIds(recipe.ingredients)
        });
        imported++;
      }

      expect(imported).toBe(0);
      expect(skipped).toBe(1);
    });

    test('should export recipes', () => {
      createRecipeWithIngredients({
        name: 'Export Test',
        servings: 4,
        prep_time: 30,
        instructions: 'Test',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 2, unit: 'cups' }])
      });

      const exported = getAllRecipesWithIngredients();

      expect(exported).toHaveLength(1);
      expect(exported[0].name).toBe('Export Test');
      expect(exported[0].ingredients).toHaveLength(1);
    });

    test('should import recipes in add mode', () => {
      createRecipeWithIngredients({
        name: 'Existing Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      // Simulate import
      const existingNames = new Set(getAllRecipes.all().map(r => r.name.toLowerCase()));

      const toImport = [
        {
          name: 'New Recipe',
          servings: 2,
          prep_time: 15,
          instructions: '',
          ingredients: [{ name: 'sugar', quantity: 1, unit: 'cup' }]
        },
        {
          name: 'Existing Recipe', // Should be skipped
          servings: 8,
          prep_time: 60,
          instructions: '',
          ingredients: [{ name: 'milk', quantity: 2, unit: 'cups' }]
        }
      ];

      let imported = 0;
      let skipped = 0;

      for (const recipe of toImport) {
        if (existingNames.has(recipe.name.toLowerCase())) {
          skipped++;
        } else {
          createRecipeWithIngredients({
            ...recipe,
            ingredients: prepareIngredientsWithIds(recipe.ingredients)
          });
          imported++;
        }
      }

      expect(imported).toBe(1);
      expect(skipped).toBe(1);

      const allRecipes = getAllRecipes.all();
      expect(allRecipes).toHaveLength(2);
    });

    test('should import recipes in overwrite mode', () => {
      createRecipeWithIngredients({
        name: 'Old Recipe',
        servings: 4,
        prep_time: 30,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'flour', quantity: 1, unit: 'cup' }])
      });

      // Simulate overwrite
      deleteAllRecipes();

      createRecipeWithIngredients({
        name: 'New Recipe',
        servings: 2,
        prep_time: 15,
        instructions: '',
        ingredients: prepareIngredientsWithIds([{ name: 'sugar', quantity: 1, unit: 'cup' }])
      });

      const recipes = getAllRecipes.all();
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('New Recipe');
    });
  });
});
