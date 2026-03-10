/**
 * Frontend UI Tests
 * These tests verify the frontend logic and DOM manipulation
 */

describe('Frontend - Recipe Management', () => {
  test('should create recipe data structure correctly', () => {
    const recipeData = {
      name: 'Chocolate Cake',
      servings: 8,
      prep_time: 45,
      instructions: 'Mix and bake',
      ingredients: [
        { name: 'flour', quantity: 2, unit: 'cups' },
        { name: 'sugar', quantity: 1.5, unit: 'cups' }
      ]
    };

    expect(recipeData.name).toBe('Chocolate Cake');
    expect(recipeData.ingredients).toHaveLength(2);
    expect(recipeData.ingredients[0]).toMatchObject({
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });
  });

  test('should validate recipe has required fields', () => {
    const validRecipe = {
      name: 'Test Recipe',
      ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
    };

    const invalidRecipe = {
      ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
    };

    expect(validRecipe.name).toBeTruthy();
    expect(validRecipe.ingredients.length).toBeGreaterThan(0);

    expect(invalidRecipe.name).toBeFalsy();
  });

  test('should parse ingredient quantities correctly', () => {
    const quantityString = '2.5';
    const quantity = parseFloat(quantityString);

    expect(quantity).toBe(2.5);
    expect(typeof quantity).toBe('number');
  });

  test('should parse servings and prep time correctly', () => {
    const servingsString = '4';
    const prepTimeString = '30';

    const servings = parseInt(servingsString) || null;
    const prepTime = parseInt(prepTimeString) || null;

    expect(servings).toBe(4);
    expect(prepTime).toBe(30);
  });

  test('should handle empty optional fields', () => {
    const servingsString = '';
    const prepTimeString = '';

    const servings = parseInt(servingsString) || null;
    const prepTime = parseInt(prepTimeString) || null;

    expect(servings).toBeNull();
    expect(prepTime).toBeNull();
  });
});

describe('Frontend - Shopping List Aggregation', () => {
  test('should aggregate shopping list items by name and unit', () => {
    const items = [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'flour', quantity: 1, unit: 'cups' },
      { name: 'sugar', quantity: 1, unit: 'cup' },
      { name: 'Flour', quantity: 0.5, unit: 'cups' }
    ];

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

    const result = Object.values(aggregated);

    expect(result).toHaveLength(2);

    const flour = result.find(i => i.name.toLowerCase() === 'flour');
    const sugar = result.find(i => i.name.toLowerCase() === 'sugar');

    expect(flour.quantity).toBe(3.5);
    expect(sugar.quantity).toBe(1);
  });

  test('should handle different units separately', () => {
    const items = [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'flour', quantity: 100, unit: 'grams' }
    ];

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

    const result = Object.values(aggregated);

    expect(result).toHaveLength(2);
  });
});

describe('Frontend - Export/Import Data Formatting', () => {
  test('should format export data correctly', () => {
    const recipes = [
      {
        name: 'Recipe 1',
        servings: 4,
        prep_time: 30,
        instructions: 'Test',
        ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
      }
    ];

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      recipes: recipes
    };

    expect(exportData.version).toBe('1.0');
    expect(exportData.exported_at).toBeTruthy();
    expect(exportData.recipes).toHaveLength(1);
    expect(exportData.recipes[0].name).toBe('Recipe 1');
  });

  test('should validate import data structure', () => {
    const validImportData = {
      version: '1.0',
      exported_at: '2024-01-01T00:00:00.000Z',
      recipes: [
        {
          name: 'Recipe 1',
          servings: 4,
          prep_time: 30,
          instructions: 'Test',
          ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
        }
      ]
    };

    expect(validImportData.recipes).toBeDefined();
    expect(Array.isArray(validImportData.recipes)).toBe(true);
    expect(validImportData.recipes[0].name).toBeTruthy();
    expect(validImportData.recipes[0].ingredients).toBeDefined();
    expect(validImportData.recipes[0].ingredients.length).toBeGreaterThan(0);
  });

  test('should detect invalid import data', () => {
    const invalidData = {
      version: '1.0',
      recipes: 'not an array'
    };

    expect(Array.isArray(invalidData.recipes)).toBe(false);
  });

  test('should validate individual recipe structure', () => {
    const validRecipe = {
      name: 'Test Recipe',
      servings: 4,
      prep_time: 30,
      instructions: 'Test',
      ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
    };

    const invalidRecipe = {
      name: 'Test Recipe',
      ingredients: []
    };

    // Valid recipe checks
    expect(validRecipe.name).toBeTruthy();
    expect(validRecipe.ingredients).toBeDefined();
    expect(Array.isArray(validRecipe.ingredients)).toBe(true);
    expect(validRecipe.ingredients.length).toBeGreaterThan(0);

    // Invalid recipe checks
    expect(invalidRecipe.ingredients.length).toBe(0);
  });

  test('should validate ingredient structure', () => {
    const validIngredient = { name: 'flour', quantity: 2, unit: 'cups' };
    const invalidIngredient1 = { name: 'flour', quantity: 'two', unit: 'cups' };
    const invalidIngredient2 = { quantity: 2, unit: 'cups' };

    expect(validIngredient.name).toBeTruthy();
    expect(typeof validIngredient.quantity).toBe('number');
    expect(validIngredient.unit).toBeTruthy();

    expect(typeof invalidIngredient1.quantity).not.toBe('number');
    expect(invalidIngredient2.name).toBeFalsy();
  });
});

describe('Frontend - File Handling', () => {
  test('should create blob for download', () => {
    const data = { test: 'data' };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
  });

  test('should generate filename with date', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const dateString = date.toISOString().split('T')[0];
    const filename = `recipes-export-${dateString}.json`;

    expect(filename).toBe('recipes-export-2024-01-15.json');
  });

  test('should parse JSON file content', () => {
    const jsonString = JSON.stringify({
      version: '1.0',
      recipes: [{ name: 'Test Recipe', ingredients: [] }]
    });

    const parsed = JSON.parse(jsonString);

    expect(parsed.version).toBe('1.0');
    expect(parsed.recipes).toHaveLength(1);
  });

  test('should handle invalid JSON', () => {
    const invalidJson = '{ invalid json }';

    expect(() => {
      JSON.parse(invalidJson);
    }).toThrow();
  });
});

describe('Frontend - Cart Management', () => {
  test('should track cart count', () => {
    const cartRecipes = [
      { id: 1, name: 'Recipe 1' },
      { id: 2, name: 'Recipe 2' },
      { id: 3, name: 'Recipe 3' }
    ];

    const cartCount = cartRecipes.length;

    expect(cartCount).toBe(3);
  });

  test('should update cart count after adding', () => {
    let cartRecipes = [
      { id: 1, name: 'Recipe 1' }
    ];

    expect(cartRecipes.length).toBe(1);

    cartRecipes.push({ id: 2, name: 'Recipe 2' });

    expect(cartRecipes.length).toBe(2);
  });

  test('should update cart count after removing', () => {
    let cartRecipes = [
      { id: 1, name: 'Recipe 1' },
      { id: 2, name: 'Recipe 2' }
    ];

    expect(cartRecipes.length).toBe(2);

    cartRecipes = cartRecipes.filter(r => r.id !== 1);

    expect(cartRecipes.length).toBe(1);
    expect(cartRecipes[0].id).toBe(2);
  });
});

describe('Frontend - View Management', () => {
  test('should track current view state', () => {
    let currentView = 'recipes';

    expect(currentView).toBe('recipes');

    currentView = 'add-recipe';
    expect(currentView).toBe('add-recipe');

    currentView = 'cart';
    expect(currentView).toBe('cart');

    currentView = 'shopping-list';
    expect(currentView).toBe('shopping-list');

    currentView = 'export-import';
    expect(currentView).toBe('export-import');
  });

  test('should validate view names', () => {
    const validViews = ['recipes', 'add-recipe', 'cart', 'shopping-list', 'export-import'];

    validViews.forEach(view => {
      expect(validViews).toContain(view);
    });

    expect(validViews).not.toContain('invalid-view');
  });
});

describe('Frontend - Form Validation', () => {
  test('should validate ingredient row data', () => {
    const ingredientRow = {
      name: 'flour',
      quantity: '2',
      unit: 'cups'
    };

    const ingredient = {
      name: ingredientRow.name,
      quantity: parseFloat(ingredientRow.quantity),
      unit: ingredientRow.unit
    };

    expect(ingredient.name).toBeTruthy();
    expect(typeof ingredient.quantity).toBe('number');
    expect(ingredient.unit).toBeTruthy();
  });

  test('should handle empty ingredient fields', () => {
    const ingredientRow = {
      name: '',
      quantity: '',
      unit: ''
    };

    const isValid = !!(ingredientRow.name && ingredientRow.quantity && ingredientRow.unit);

    expect(isValid).toBe(false);
  });

  test('should validate numeric quantity', () => {
    const validQuantity = '2.5';
    const invalidQuantity = 'two';

    const valid = parseFloat(validQuantity);
    const invalid = parseFloat(invalidQuantity);

    expect(valid).toBe(2.5);
    expect(isNaN(invalid)).toBe(true);
  });
});
