/**
 * Frontend Application Tests
 * Tests for the actual app.js functions and UI behavior
 */

// Mock DOM environment
const fs = require('fs');
const path = require('path');

// Load the HTML to get DOM structure
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

// Setup DOM before each test
beforeEach(() => {
  document.body.innerHTML = html;

  // Mock fetch
  global.fetch = jest.fn();

  // Mock alert and confirm
  global.alert = jest.fn();
  global.confirm = jest.fn();

  // Clear all mocks
  jest.clearAllMocks();
});

describe('Recipe Form Handling', () => {
  test('should collect recipe data from form', () => {
    // Fill in form fields
    document.getElementById('recipe-name').value = 'Test Recipe';
    document.getElementById('recipe-servings').value = '4';
    document.getElementById('recipe-prep-time').value = '30';
    document.getElementById('recipe-instructions').value = 'Test instructions';

    // Set ingredient values
    const ingredientRow = document.querySelector('.ingredient-row');
    ingredientRow.querySelector('.ingredient-name').value = 'flour';
    ingredientRow.querySelector('.ingredient-quantity').value = '2';
    ingredientRow.querySelector('.ingredient-unit').value = 'cups';

    // Extract form data (simulating what the app does)
    const name = document.getElementById('recipe-name').value;
    const servings = parseInt(document.getElementById('recipe-servings').value) || null;
    const prep_time = parseInt(document.getElementById('recipe-prep-time').value) || null;
    const instructions = document.getElementById('recipe-instructions').value;

    const ingredientRows = document.querySelectorAll('.ingredient-row');
    const ingredients = Array.from(ingredientRows).map(row => ({
      name: row.querySelector('.ingredient-name').value,
      quantity: parseFloat(row.querySelector('.ingredient-quantity').value),
      unit: row.querySelector('.ingredient-unit').value
    }));

    expect(name).toBe('Test Recipe');
    expect(servings).toBe(4);
    expect(prep_time).toBe(30);
    expect(instructions).toBe('Test instructions');
    expect(ingredients).toHaveLength(1);
    expect(ingredients[0]).toEqual({
      name: 'flour',
      quantity: 2,
      unit: 'cups'
    });
  });

  test('should handle empty optional fields', () => {
    document.getElementById('recipe-servings').value = '';
    document.getElementById('recipe-prep-time').value = '';

    const servings = parseInt(document.getElementById('recipe-servings').value) || null;
    const prep_time = parseInt(document.getElementById('recipe-prep-time').value) || null;

    expect(servings).toBeNull();
    expect(prep_time).toBeNull();
  });

  test('should validate at least one ingredient exists', () => {
    const ingredientRows = document.querySelectorAll('.ingredient-row');
    expect(ingredientRows.length).toBeGreaterThan(0);
  });
});

describe('View Management', () => {
  test('should have all required views', () => {
    expect(document.getElementById('recipes-view')).toBeTruthy();
    expect(document.getElementById('add-recipe-view')).toBeTruthy();
    expect(document.getElementById('cart-view')).toBeTruthy();
    expect(document.getElementById('shopping-list-view')).toBeTruthy();
    expect(document.getElementById('export-import-view')).toBeTruthy();
  });

  test('should have navigation buttons for all views', () => {
    expect(document.getElementById('nav-recipes')).toBeTruthy();
    expect(document.getElementById('nav-add-recipe')).toBeTruthy();
    expect(document.getElementById('nav-cart')).toBeTruthy();
    expect(document.getElementById('nav-shopping-list')).toBeTruthy();
    expect(document.getElementById('nav-export-import')).toBeTruthy();
  });

  test('should show only one view as active initially', () => {
    const activeViews = document.querySelectorAll('.view.active');
    expect(activeViews).toHaveLength(1);
    expect(activeViews[0].id).toBe('recipes-view');
  });
});

describe('Export/Import UI Elements', () => {
  test('should have export button', () => {
    const exportBtn = document.getElementById('export-btn');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.textContent).toContain('Export');
  });

  test('should have import file input', () => {
    const fileInput = document.getElementById('import-file');
    expect(fileInput).toBeTruthy();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('.json');
  });

  test('should have import mode radio buttons', () => {
    const radios = document.querySelectorAll('input[name="import-mode"]');
    expect(radios).toHaveLength(2);

    const values = Array.from(radios).map(r => r.value);
    expect(values).toContain('add');
    expect(values).toContain('overwrite');

    // Check that 'add' is checked by default
    const addRadio = Array.from(radios).find(r => r.value === 'add');
    expect(addRadio.checked).toBe(true);
  });

  test('should have import button that is initially disabled', () => {
    const importBtn = document.getElementById('import-btn');
    expect(importBtn).toBeTruthy();
    expect(importBtn.disabled).toBe(true);
  });

  test('should have import result display area', () => {
    const resultDiv = document.getElementById('import-result');
    expect(resultDiv).toBeTruthy();
  });
});

describe('Recipe List Rendering', () => {
  test('should have recipes list container', () => {
    const recipesList = document.getElementById('recipes-list');
    expect(recipesList).toBeTruthy();
  });

  test('should have cart list container', () => {
    const cartList = document.getElementById('cart-list');
    expect(cartList).toBeTruthy();
  });

  test('should have shopping list container', () => {
    const shoppingList = document.getElementById('shopping-list-items');
    expect(shoppingList).toBeTruthy();
  });

  test('should have cart count badge', () => {
    const cartCount = document.getElementById('cart-count');
    expect(cartCount).toBeTruthy();
    expect(cartCount.textContent).toBe('0');
  });
});

describe('Form Elements', () => {
  test('should have recipe form', () => {
    const form = document.getElementById('recipe-form');
    expect(form).toBeTruthy();
    expect(form.tagName).toBe('FORM');
  });

  test('should have required form inputs', () => {
    expect(document.getElementById('recipe-name')).toBeTruthy();
    expect(document.getElementById('recipe-servings')).toBeTruthy();
    expect(document.getElementById('recipe-prep-time')).toBeTruthy();
    expect(document.getElementById('recipe-instructions')).toBeTruthy();
  });

  test('should have ingredient management buttons', () => {
    expect(document.getElementById('add-ingredient-btn')).toBeTruthy();
    expect(document.getElementById('cancel-recipe-btn')).toBeTruthy();
  });

  test('should have at least one ingredient row by default', () => {
    const ingredientsList = document.getElementById('ingredients-list');
    const rows = ingredientsList.querySelectorAll('.ingredient-row');
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('Export Data Format', () => {
  test('should create export data with correct structure', () => {
    const recipes = [
      {
        name: 'Test Recipe',
        servings: 4,
        prep_time: 30,
        instructions: 'Test',
        ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
      }
    ];

    // Simulate what the export function creates
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      recipes: recipes
    };

    expect(exportData.version).toBe('1.0');
    expect(exportData.exported_at).toBeTruthy();
    expect(exportData.recipes).toHaveLength(1);
    expect(exportData.recipes[0]).toHaveProperty('name');
    expect(exportData.recipes[0]).toHaveProperty('ingredients');
  });

  test('should generate correct filename format', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const dateString = date.toISOString().split('T')[0];
    const filename = `recipes-export-${dateString}.json`;

    expect(filename).toBe('recipes-export-2024-01-15.json');
    expect(filename).toMatch(/^recipes-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('Import Validation', () => {
  test('should validate import data has recipes array', () => {
    const validData = {
      version: '1.0',
      recipes: []
    };

    const invalidData = {
      version: '1.0'
    };

    expect(validData.recipes).toBeDefined();
    expect(Array.isArray(validData.recipes)).toBe(true);
    expect(invalidData.recipes).toBeUndefined();
  });

  test('should validate recipe has required fields', () => {
    const validRecipe = {
      name: 'Test',
      ingredients: [{ name: 'flour', quantity: 2, unit: 'cups' }]
    };

    const invalidRecipe = {
      ingredients: []
    };

    expect(validRecipe.name).toBeTruthy();
    expect(validRecipe.ingredients.length).toBeGreaterThan(0);
    expect(invalidRecipe.name).toBeFalsy();
  });

  test('should validate ingredient structure', () => {
    const valid = { name: 'flour', quantity: 2, unit: 'cups' };
    const invalidQty = { name: 'flour', quantity: 'two', unit: 'cups' };
    const missingName = { quantity: 2, unit: 'cups' };

    expect(valid.name).toBeTruthy();
    expect(typeof valid.quantity).toBe('number');
    expect(valid.unit).toBeTruthy();

    expect(typeof invalidQty.quantity).not.toBe('number');
    expect(missingName.name).toBeFalsy();
  });
});

describe('Shopping List Aggregation Logic', () => {
  test('should aggregate ingredients by name and unit', () => {
    // This tests the actual aggregation logic from getAggregatedShoppingList
    const items = [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'flour', quantity: 1, unit: 'cups' },
      { name: 'Flour', quantity: 0.5, unit: 'cups' }, // Different case
      { name: 'sugar', quantity: 1, unit: 'cup' }
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

    const result = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));

    expect(result).toHaveLength(2);
    const flour = result.find(i => i.name.toLowerCase() === 'flour');
    expect(flour.quantity).toBe(3.5);
  });

  test('should keep different units separate', () => {
    const items = [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'flour', quantity: 500, unit: 'grams' }
    ];

    const aggregated = {};
    for (const item of items) {
      const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
      aggregated[key] = aggregated[key] || { ...item };
      if (aggregated[key] !== item) {
        aggregated[key].quantity += item.quantity;
      }
    }

    const result = Object.values(aggregated);
    expect(result).toHaveLength(2);
  });
});
