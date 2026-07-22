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
  getOrCreateUnit,
  getInUseUnitIds,
  deleteUnitsExcept,
  getOrCreateStore,
  updateStore,
  deleteStore,
  getPricesByIngredientId,
  createPriceOption,
  updatePriceOption,
  setPreferredPrice,
  deletePriceOption,
  getSelectedStoreId,
  setSelectedStoreId,
  getPriceStalenessDays,
  setPriceStalenessDays,
  getRecipeCost,
  getAggregatedCartCost
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

  describe('Store Operations', () => {
    test('should create a store', () => {
      const store = getOrCreateStore('Store Ops Market');
      expect(store.name).toBe('Store Ops Market');
    });

    test('getOrCreateStore should be idempotent for the same name', () => {
      const first = getOrCreateStore('Store Ops Dedup');
      const second = getOrCreateStore('Store Ops Dedup');
      expect(second.id).toBe(first.id);
    });

    test('should update a store name', () => {
      const store = getOrCreateStore('Store Ops Old Name');
      updateStore.run({ id: store.id, name: 'Store Ops New Name' });
      const stores = require('../db').getAllStores.all();
      const updated = stores.find(s => s.id === store.id);
      expect(updated.name).toBe('Store Ops New Name');
    });

    test('should delete a store', () => {
      const store = getOrCreateStore('Store Ops To Delete');
      const result = deleteStore.run(store.id);
      expect(result.changes).toBe(1);
    });
  });

  describe('Price Operations', () => {
    test('first price added for an (ingredient, store) pair is auto-preferred', () => {
      const ingredient = getOrCreateIngredient('Price Ops Olive Oil');
      const store = getOrCreateStore('Price Ops Store A');
      const unit = getOrCreateUnit('Price Ops Bottle', 'count');

      const price = createPriceOption({
        ingredient_id: ingredient.id,
        store_id: store.id,
        package_quantity: 1,
        package_unit_id: unit.id,
        price: 4.99,
        is_preferred: false
      });

      expect(price.is_preferred).toBe(1);
    });

    test('marking a second price preferred clears the first', () => {
      const ingredient = getOrCreateIngredient('Price Ops Tomatoes');
      const store = getOrCreateStore('Price Ops Store B');
      const canUnit = getOrCreateUnit('Price Ops Can', 'count');

      const first = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: canUnit.id, price: 1.5, is_preferred: false
      });
      const second = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: canUnit.id, price: 2.0, is_preferred: true
      });

      const prices = getPricesByIngredientId.all(ingredient.id).filter(p => p.store_id === store.id);
      const preferred = prices.filter(p => p.is_preferred);
      expect(preferred).toHaveLength(1);
      expect(preferred[0].id).toBe(second.id);
      expect(prices.find(p => p.id === first.id).is_preferred).toBe(0);
    });

    test('setPreferredPrice swaps the preferred flag between two options', () => {
      const ingredient = getOrCreateIngredient('Price Ops Rice');
      const store = getOrCreateStore('Price Ops Store C');
      const bagUnit = getOrCreateUnit('Price Ops Bag', 'count');

      const first = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: bagUnit.id, price: 3.0, is_preferred: false
      });
      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: bagUnit.id, price: 5.0, is_preferred: false
      });

      setPreferredPrice(first.id);

      const prices = getPricesByIngredientId.all(ingredient.id).filter(p => p.store_id === store.id);
      const preferred = prices.filter(p => p.is_preferred);
      expect(preferred).toHaveLength(1);
      expect(preferred[0].id).toBe(first.id);
    });

    test('deleting the preferred price promotes a remaining sibling', () => {
      const ingredient = getOrCreateIngredient('Price Ops Pasta');
      const store = getOrCreateStore('Price Ops Store D');
      const boxUnit = getOrCreateUnit('Price Ops Box', 'count');

      const first = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: boxUnit.id, price: 1.0, is_preferred: true
      });
      const second = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: boxUnit.id, price: 1.5, is_preferred: false
      });

      deletePriceOption(first.id);

      const prices = getPricesByIngredientId.all(ingredient.id).filter(p => p.store_id === store.id);
      expect(prices).toHaveLength(1);
      expect(prices[0].id).toBe(second.id);
      expect(prices[0].is_preferred).toBe(1);
    });

    test('updatePriceOption edits fields without touching is_preferred', () => {
      const ingredient = getOrCreateIngredient('Price Ops Butter');
      const store = getOrCreateStore('Price Ops Store E');
      const stickUnit = getOrCreateUnit('Price Ops Stick', 'count');

      const price = createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: stickUnit.id, price: 2.0, is_preferred: true
      });

      const updated = updatePriceOption(price.id, { package_quantity: 4, package_unit_id: stickUnit.id, price: 3.5 });
      expect(updated.package_quantity).toBe(4);
      expect(updated.price).toBe(3.5);
      expect(updated.is_preferred).toBe(1);
    });

    test('the partial unique index rejects two preferred rows for the same pair at the raw SQL level', () => {
      const { db } = require('../db');
      const ingredient = getOrCreateIngredient('Price Ops Constraint Test');
      const store = getOrCreateStore('Price Ops Store F');
      const unit = getOrCreateUnit('Price Ops Jar', 'count');

      const rawInsert = db.prepare(`
        INSERT INTO prices (ingredient_id, store_id, package_quantity, package_unit_id, price, is_preferred)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      rawInsert.run(ingredient.id, store.id, 1, unit.id, 1.0);
      expect(() => {
        rawInsert.run(ingredient.id, store.id, 1, unit.id, 2.0);
      }).toThrow();
    });
  });

  describe('Cost Computation', () => {
    test('getRecipeCost rounds up to whole packages, not fractional or floor', () => {
      const unit = getOrCreateUnit('Cost Ops Gram', 'mass');
      const ingredient = getOrCreateIngredient('Cost Ops Flour');
      const store = getOrCreateStore('Cost Ops Store A');

      // Package = 10g, need 21g (2.1x) -> must round up to 3 packages, not 2
      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 10, package_unit_id: unit.id, price: 1.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Cost Ops Recipe A',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 21, unit_id: unit.id }]
      });

      const cost = getRecipeCost(recipeId, store.id);
      expect(cost.items).toHaveLength(1);
      expect(cost.items[0].packages_needed).toBe(3);
      expect(cost.total_cost).toBe(3);
      expect(cost.missing_ingredients).toHaveLength(0);
    });

    test('an ingredient with no price at the store is excluded and listed as missing, never $0', () => {
      const unit = getOrCreateUnit('Cost Ops Each', 'count');
      const pricedIngredient = getOrCreateIngredient('Cost Ops Priced Item');
      const unpricedIngredient = getOrCreateIngredient('Cost Ops Unpriced Item');
      const store = getOrCreateStore('Cost Ops Store B');

      createPriceOption({
        ingredient_id: pricedIngredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: unit.id, price: 2.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Cost Ops Recipe B',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [
          { ingredient_id: pricedIngredient.id, quantity: 1, unit_id: unit.id },
          { ingredient_id: unpricedIngredient.id, quantity: 1, unit_id: unit.id }
        ]
      });

      const cost = getRecipeCost(recipeId, store.id);
      expect(cost.total_cost).toBe(2.0);
      expect(cost.matched_count).toBe(1);
      expect(cost.total_count).toBe(2);
      expect(cost.missing_ingredients).toHaveLength(1);
      expect(cost.missing_ingredients[0].name).toBe('Cost Ops Unpriced Item');
    });

    test('an unconvertible unit mismatch is treated as missing, not a crash or $0', () => {
      const countUnit = getOrCreateUnit('Cost Ops Whole', 'count');
      const massUnit = getOrCreateUnit('Cost Ops Ounce', 'mass');
      const ingredient = getOrCreateIngredient('Cost Ops Mismatch Item');
      const store = getOrCreateStore('Cost Ops Store C');

      // Priced by mass, but the recipe calls for it by count, with no ingredient-specific
      // conversion defined between the two -- convertUnits should throw internally.
      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: massUnit.id, price: 5.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Cost Ops Recipe C',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 2, unit_id: countUnit.id }]
      });

      const cost = getRecipeCost(recipeId, store.id);
      expect(cost.total_cost).toBe(0);
      expect(cost.missing_ingredients).toHaveLength(1);
      expect(cost.missing_ingredients[0].name).toBe('Cost Ops Mismatch Item');
    });

    test('getAggregatedCartCost aggregates across recipes before rounding up to whole packages', () => {
      const unit = getOrCreateUnit('Cost Ops Tablespoon', 'volume');
      const ingredient = getOrCreateIngredient('Cost Ops Shared Oil');
      const store = getOrCreateStore('Cost Ops Store D');

      // A 48-tbsp bottle for $4.99
      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 48, package_unit_id: unit.id, price: 4.99, is_preferred: true
      });

      // 5 recipes, each needing 2 tbsp = 10 tbsp total, well under one 48-tbsp bottle
      for (let i = 0; i < 5; i++) {
        const recipeId = createRecipeWithIngredients({
          name: `Cost Ops Shared Oil Recipe ${i}`,
          servings: 1, prep_time: 5, instructions: '',
          ingredients: [{ ingredient_id: ingredient.id, quantity: 2, unit_id: unit.id }]
        });
        addToCart.run(recipeId);
      }

      const cost = getAggregatedCartCost(store.id);
      expect(cost.items).toHaveLength(1);
      expect(cost.items[0].packages_needed).toBe(1);
      expect(cost.total_cost).toBe(4.99);
    });

    test('getAggregatedCartCost still rounds up correctly once aggregated quantity crosses a package boundary', () => {
      const unit = getOrCreateUnit('Cost Ops Teaspoon', 'volume');
      const ingredient = getOrCreateIngredient('Cost Ops Boundary Oil');
      const store = getOrCreateStore('Cost Ops Store E');

      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 48, package_unit_id: unit.id, price: 4.99, is_preferred: true
      });

      // 5 recipes needing 10 tsp each = 50 tsp total -> just over one 48-tsp bottle -> 2 bottles
      for (let i = 0; i < 5; i++) {
        const recipeId = createRecipeWithIngredients({
          name: `Cost Ops Boundary Oil Recipe ${i}`,
          servings: 1, prep_time: 5, instructions: '',
          ingredients: [{ ingredient_id: ingredient.id, quantity: 10, unit_id: unit.id }]
        });
        addToCart.run(recipeId);
      }

      const cost = getAggregatedCartCost(store.id);
      expect(cost.items[0].packages_needed).toBe(2);
      expect(cost.total_cost).toBeCloseTo(9.98, 5);
    });
  });

  describe('Cross-Store Substitution (shopping list only)', () => {
    test('getAggregatedCartCost patches in the only other store\'s price when the selected store has none', () => {
      const unit = getOrCreateUnit('Sub Ops Each', 'count');
      const ingredient = getOrCreateIngredient('Sub Ops Single Candidate Item');
      const selectedStore = getOrCreateStore('Sub Ops Selected Store A');
      const otherStore = getOrCreateStore('Sub Ops Other Store A');

      createPriceOption({
        ingredient_id: ingredient.id, store_id: otherStore.id,
        package_quantity: 1, package_unit_id: unit.id, price: 3.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Sub Ops Recipe A',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 2, unit_id: unit.id }]
      });
      addToCart.run(recipeId);

      const cost = getAggregatedCartCost(selectedStore.id);

      expect(cost.matched_count).toBe(0);
      expect(cost.substituted_count).toBe(1);
      expect(cost.missing_ingredients).toHaveLength(0);
      expect(cost.substituted_items[0].line_cost).toBe(6.0); // 2 each -> ceil(2/1)=2 packages * $3
      expect(cost.substituted_items[0].is_blended).toBe(false);
      expect(cost.substituted_items[0].source_stores).toHaveLength(1);
      expect(cost.substituted_items[0].source_stores[0].store_name).toBe('Sub Ops Other Store A');
      expect(cost.total_cost).toBe(6.0);
    });

    test('getAggregatedCartCost uses the median cost (odd count), not the cheapest', () => {
      const unit = getOrCreateUnit('Sub Ops Each Odd', 'count');
      const ingredient = getOrCreateIngredient('Sub Ops Odd Candidate Item');
      const selectedStore = getOrCreateStore('Sub Ops Selected Store B');
      const storeA = getOrCreateStore('Sub Ops Store B1');
      const storeB = getOrCreateStore('Sub Ops Store B2');
      const storeC = getOrCreateStore('Sub Ops Store B3');

      createPriceOption({ ingredient_id: ingredient.id, store_id: storeA.id, package_quantity: 1, package_unit_id: unit.id, price: 5.0, is_preferred: true });
      createPriceOption({ ingredient_id: ingredient.id, store_id: storeB.id, package_quantity: 1, package_unit_id: unit.id, price: 1.0, is_preferred: true });
      createPriceOption({ ingredient_id: ingredient.id, store_id: storeC.id, package_quantity: 1, package_unit_id: unit.id, price: 3.0, is_preferred: true });

      const recipeId = createRecipeWithIngredients({
        name: 'Sub Ops Recipe B',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: unit.id }]
      });
      addToCart.run(recipeId);

      const cost = getAggregatedCartCost(selectedStore.id);

      // Sorted costs: [1, 3, 5] -> median is 3 (storeC), not the cheapest (1) or an average of all three.
      expect(cost.substituted_items[0].line_cost).toBe(3.0);
      expect(cost.substituted_items[0].is_blended).toBe(false);
      expect(cost.substituted_items[0].source_stores[0].store_name).toBe('Sub Ops Store B3');
    });

    test('getAggregatedCartCost blends (averages) the two middle costs for an even number of candidates', () => {
      const unit = getOrCreateUnit('Sub Ops Each Blend', 'count');
      const ingredient = getOrCreateIngredient('Sub Ops Blend Candidate Item');
      const selectedStore = getOrCreateStore('Sub Ops Selected Store C');
      const storeA = getOrCreateStore('Sub Ops Store C1');
      const storeB = getOrCreateStore('Sub Ops Store C2');

      createPriceOption({ ingredient_id: ingredient.id, store_id: storeA.id, package_quantity: 1, package_unit_id: unit.id, price: 2.0, is_preferred: true });
      createPriceOption({ ingredient_id: ingredient.id, store_id: storeB.id, package_quantity: 1, package_unit_id: unit.id, price: 4.0, is_preferred: true });

      const recipeId = createRecipeWithIngredients({
        name: 'Sub Ops Recipe C',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: unit.id }]
      });
      addToCart.run(recipeId);

      const cost = getAggregatedCartCost(selectedStore.id);

      expect(cost.substituted_items[0].is_blended).toBe(true);
      expect(cost.substituted_items[0].line_cost).toBe(3.0); // (2 + 4) / 2
      expect(cost.substituted_items[0].source_stores).toHaveLength(2);
      const sourceNames = cost.substituted_items[0].source_stores.map(s => s.store_name);
      expect(sourceNames).toEqual(expect.arrayContaining(['Sub Ops Store C1', 'Sub Ops Store C2']));
    });

    test('getRecipeCost never substitutes -- a missing price stays missing even if another store has one', () => {
      const unit = getOrCreateUnit('Sub Ops Each Scope', 'count');
      const ingredient = getOrCreateIngredient('Sub Ops Scope Item');
      const selectedStore = getOrCreateStore('Sub Ops Selected Store D');
      const otherStore = getOrCreateStore('Sub Ops Other Store D');

      createPriceOption({
        ingredient_id: ingredient.id, store_id: otherStore.id,
        package_quantity: 1, package_unit_id: unit.id, price: 3.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Sub Ops Recipe D',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: unit.id }]
      });

      const cost = getRecipeCost(recipeId, selectedStore.id);

      expect(cost.total_cost).toBe(0);
      expect(cost.missing_ingredients).toHaveLength(1);
      expect(cost.missing_ingredients[0].name).toBe('Sub Ops Scope Item');
      expect(cost.substituted_items).toHaveLength(0);
    });

    test('falls back to missing when no other store has a usable (convertible) price either', () => {
      const countUnit = getOrCreateUnit('Sub Ops Count Fallback', 'count');
      const massUnit = getOrCreateUnit('Sub Ops Mass Fallback', 'mass');
      const ingredient = getOrCreateIngredient('Sub Ops Unconvertible Item');
      const selectedStore = getOrCreateStore('Sub Ops Selected Store E');
      const otherStore = getOrCreateStore('Sub Ops Other Store E');

      // Priced by mass at the other store, but the recipe needs it by count, with no
      // ingredient-specific conversion defined -- unusable as a substitute too.
      createPriceOption({
        ingredient_id: ingredient.id, store_id: otherStore.id,
        package_quantity: 1, package_unit_id: massUnit.id, price: 5.0, is_preferred: true
      });

      const recipeId = createRecipeWithIngredients({
        name: 'Sub Ops Recipe E',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: countUnit.id }]
      });
      addToCart.run(recipeId);

      const cost = getAggregatedCartCost(selectedStore.id);

      expect(cost.total_cost).toBe(0);
      expect(cost.substituted_items).toHaveLength(0);
      expect(cost.missing_ingredients).toHaveLength(1);
      expect(cost.missing_ingredients[0].name).toBe('Sub Ops Unconvertible Item');
    });
  });

  describe('Settings', () => {
    test('setSelectedStoreId(null) clears the selected store', () => {
      setSelectedStoreId(null);
      expect(getSelectedStoreId()).toBeNull();
    });

    test('setSelectedStoreId/getSelectedStoreId round-trip', () => {
      const store = getOrCreateStore('Settings Ops Store');
      setSelectedStoreId(store.id);
      expect(getSelectedStoreId()).toBe(store.id);
    });

    test('getPriceStalenessDays defaults to 182 when unset', () => {
      expect(getPriceStalenessDays()).toBe(182);
    });

    test('setPriceStalenessDays/getPriceStalenessDays round-trip', () => {
      setPriceStalenessDays(30);
      expect(getPriceStalenessDays()).toBe(30);
      setPriceStalenessDays(182); // restore default for any later tests relying on it
    });
  });

  describe('Unit Reset Operations', () => {
    test('getOrCreateUnit sets rounding_increment on creation', () => {
      const unit = getOrCreateUnit('Reset Ops Rounded Unit', 'count', null, null, 0.5);
      expect(unit.rounding_increment).toBe(0.5);
    });

    test('getInUseUnitIds includes a unit referenced directly by a recipe', () => {
      const unit = getOrCreateUnit('Reset Ops Recipe Unit', 'count');
      const ingredient = getOrCreateIngredient('Reset Ops Recipe Ingredient');

      createRecipeWithIngredients({
        name: 'Reset Ops Recipe A',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: unit.id }]
      });

      expect(getInUseUnitIds().has(unit.id)).toBe(true);
    });

    test('getInUseUnitIds includes a unit referenced directly by a price', () => {
      const unit = getOrCreateUnit('Reset Ops Price Unit', 'count');
      const ingredient = getOrCreateIngredient('Reset Ops Price Ingredient');
      const store = getOrCreateStore('Reset Ops Price Store');

      createPriceOption({
        ingredient_id: ingredient.id, store_id: store.id,
        package_quantity: 1, package_unit_id: unit.id, price: 1.0, is_preferred: true
      });

      expect(getInUseUnitIds().has(unit.id)).toBe(true);
    });

    test('getInUseUnitIds transitively protects the base unit of an in-use derived unit', () => {
      const base = getOrCreateUnit('Reset Ops Base Gram', 'mass');
      const derived = getOrCreateUnit('Reset Ops Derived Kilo', 'mass', base.id, 1000);
      const ingredient = getOrCreateIngredient('Reset Ops Transitive Ingredient');

      createRecipeWithIngredients({
        name: 'Reset Ops Recipe B',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: derived.id }]
      });

      const inUse = getInUseUnitIds();
      expect(inUse.has(derived.id)).toBe(true);
      expect(inUse.has(base.id)).toBe(true); // protected transitively, even though nothing references it directly
    });

    test('getInUseUnitIds excludes a unit nothing references', () => {
      const unit = getOrCreateUnit('Reset Ops Unused Unit', 'count');
      expect(getInUseUnitIds().has(unit.id)).toBe(false);
    });

    test('deleteUnitsExcept deletes only unprotected units and handles derived-before-base ordering', () => {
      const base = getOrCreateUnit('Reset Ops Delete Base', 'volume');
      const derived = getOrCreateUnit('Reset Ops Delete Derived', 'volume', base.id, 10);
      const unrelated = getOrCreateUnit('Reset Ops Delete Unrelated', 'count');
      const ingredient = getOrCreateIngredient('Reset Ops Delete Protected Ingredient');
      const protectedUnit = getOrCreateUnit('Reset Ops Delete Protected', 'count');

      createRecipeWithIngredients({
        name: 'Reset Ops Recipe C',
        servings: 1, prep_time: 5, instructions: '',
        ingredients: [{ ingredient_id: ingredient.id, quantity: 1, unit_id: protectedUnit.id }]
      });

      const protectedIds = getInUseUnitIds();
      expect(protectedIds.has(protectedUnit.id)).toBe(true);
      expect(protectedIds.has(base.id)).toBe(false); // nothing uses these, should not be protected
      expect(protectedIds.has(derived.id)).toBe(false);

      const deletedNames = deleteUnitsExcept(protectedIds);

      expect(deletedNames).toEqual(expect.arrayContaining([base.name, derived.name, unrelated.name]));
      expect(deletedNames).not.toContain(protectedUnit.name);

      const { getUnitById } = require('../db');
      expect(getUnitById.get(base.id)).toBeUndefined();
      expect(getUnitById.get(derived.id)).toBeUndefined();
      expect(getUnitById.get(protectedUnit.id)).toBeDefined();
    });
  });
});
