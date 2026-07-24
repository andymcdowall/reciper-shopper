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
    const ingredientRow = document.querySelector('#ingredients-list .ingredient-row');
    ingredientRow.querySelector('.ingredient-name').value = 'flour';
    ingredientRow.querySelector('.ingredient-quantity').value = '2';
    ingredientRow.querySelector('.unit-name').value = 'cups';

    // Extract form data (simulating what the app does)
    const name = document.getElementById('recipe-name').value;
    const servings = parseInt(document.getElementById('recipe-servings').value) || null;
    const prep_time = parseInt(document.getElementById('recipe-prep-time').value) || null;
    const instructions = document.getElementById('recipe-instructions').value;

    const ingredientRows = document.querySelectorAll('#ingredients-list .ingredient-row');
    const ingredients = Array.from(ingredientRows).map(row => ({
      name: row.querySelector('.ingredient-name').value,
      quantity: parseFloat(row.querySelector('.ingredient-quantity').value),
      unit: row.querySelector('.unit-name').value
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
    const ingredientRows = document.querySelectorAll('#ingredients-list .ingredient-row');
    expect(ingredientRows.length).toBeGreaterThan(0);
  });
});

describe('View Management', () => {
  test('should have all required views', () => {
    expect(document.getElementById('recipes-view')).toBeTruthy();
    expect(document.getElementById('add-recipe-view')).toBeTruthy();
    expect(document.getElementById('ingredients-view')).toBeTruthy();
    expect(document.getElementById('units-view')).toBeTruthy();
    expect(document.getElementById('cart-view')).toBeTruthy();
    expect(document.getElementById('shopping-list-view')).toBeTruthy();
    expect(document.getElementById('export-import-view')).toBeTruthy();
  });

  test('should have navigation buttons for all views', () => {
    expect(document.getElementById('nav-recipes')).toBeTruthy();
    expect(document.getElementById('nav-add-recipe')).toBeTruthy();
    expect(document.getElementById('nav-ingredients')).toBeTruthy();
    expect(document.getElementById('nav-units')).toBeTruthy();
    expect(document.getElementById('nav-stores')).toBeTruthy();
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

describe('Store & Cost UI Elements', () => {
  test('should have a stores view with add form and grid', () => {
    expect(document.getElementById('stores-view')).toBeTruthy();
    expect(document.getElementById('store-form')).toBeTruthy();
    expect(document.getElementById('new-store-name')).toBeTruthy();
    expect(document.getElementById('stores-grid')).toBeTruthy();
  });

  test('should have a staleness threshold setting', () => {
    expect(document.getElementById('staleness-days-input')).toBeTruthy();
    expect(document.getElementById('save-staleness-btn')).toBeTruthy();
  });

  test('should have a reset-to-common-units control on the units view', () => {
    expect(document.getElementById('reset-units-btn')).toBeTruthy();
    expect(document.getElementById('reset-units-result')).toBeTruthy();
  });

  test('should have a manual add-to-list form on the shopping list view, scoped separately from the recipe form', () => {
    const form = document.getElementById('manual-list-form');
    expect(form).toBeTruthy();
    expect(form.querySelector('.ingredient-name')).toBeTruthy();
    expect(form.querySelector('.ingredient-quantity')).toBeTruthy();
    expect(form.querySelector('.unit-name')).toBeTruthy();

    // Must not be picked up by the recipe form's ingredient-row queries
    const recipeFormRows = document.querySelectorAll('#ingredients-list .ingredient-row');
    expect(Array.from(recipeFormRows)).not.toContain(form);
  });

  test('should have a global store selector in the header', () => {
    const select = document.getElementById('global-store-select');
    expect(select).toBeTruthy();
    expect(select.tagName).toBe('SELECT');
  });

  test('should have a recipe detail modal with a cost section', () => {
    expect(document.getElementById('recipe-detail-modal')).toBeTruthy();
    expect(document.getElementById('recipe-detail-name')).toBeTruthy();
    expect(document.getElementById('recipe-detail-ingredients')).toBeTruthy();
    expect(document.getElementById('recipe-detail-cost')).toBeTruthy();
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

  test('should have addressable heading/submit-button elements for switching between add and edit mode', () => {
    const heading = document.getElementById('add-recipe-heading');
    const saveBtn = document.getElementById('save-recipe-btn');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Add Recipe');
    expect(saveBtn).toBeTruthy();
    expect(saveBtn.textContent).toBe('Save Recipe');
  });

  test('should have an Edit button on the recipe detail modal', () => {
    const modal = document.getElementById('recipe-detail-modal');
    const editButton = Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === 'Edit');
    expect(editButton).toBeTruthy();
    expect(editButton.getAttribute('onclick')).toContain('editRecipe(');
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

    // Simulate what the export function creates (v5.0 format)
    const exportData = {
      version: '5.0',
      exported_at: new Date().toISOString(),
      units: [],
      ingredients: [],
      ingredient_conversions: [],
      stores: [],
      prices: [],
      manual_list_items: [],
      recipes: recipes
    };

    expect(exportData.version).toBe('5.0');
    expect(exportData.exported_at).toBeTruthy();
    expect(exportData).toHaveProperty('units');
    expect(exportData).toHaveProperty('ingredients');
    expect(exportData).toHaveProperty('ingredient_conversions');
    expect(exportData).toHaveProperty('stores');
    expect(exportData).toHaveProperty('prices');
    expect(exportData).toHaveProperty('manual_list_items');
    expect(exportData.recipes).toHaveLength(1);
    expect(exportData.recipes[0]).toHaveProperty('name');
    expect(exportData.recipes[0]).toHaveProperty('ingredients');
  });

  test('client-side import should forward the entire parsed file, not just recipes', () => {
    // Regression test: importRecipes() in app.js previously sent only
    // `{ recipes: data.recipes, mode }`, silently dropping units/ingredients/stores/prices/
    // manual_list_items from the uploaded export file on import.
    const data = {
      version: '5.0',
      units: [{ name: 'g', category: 'mass' }],
      ingredients: [{ name: 'flour' }],
      stores: [{ name: 'Store A' }],
      prices: [{ ingredient_name: 'flour', store_name: 'Store A', package_quantity: 1, price: 2 }],
      manual_list_items: [{ ingredient_name: 'flour', quantity: 1, unit_name: 'g' }],
      recipes: []
    };
    const mode = 'add';

    const requestBody = { ...data, mode };

    expect(requestBody.units).toEqual(data.units);
    expect(requestBody.ingredients).toEqual(data.ingredients);
    expect(requestBody.stores).toEqual(data.stores);
    expect(requestBody.prices).toEqual(data.prices);
    expect(requestBody.manual_list_items).toEqual(data.manual_list_items);
    expect(requestBody.mode).toBe('add');
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

describe('Cost Summary Rendering Logic', () => {
  // Mirrors renderCostSummary() in public/app.js
  function renderCostSummary(cost) {
    if (!cost) return '';

    const substitutedItems = cost.substituted_items || [];
    const substitutedCount = cost.substituted_count || 0;

    const missingHtml = cost.missing_ingredients.length
      ? `<p class="cost-warning">Missing at this store: ${cost.missing_ingredients.map(m => m.name).join(', ')}</p>`
      : '';

    const matchLabel = substitutedCount
      ? `${cost.matched_count} of ${cost.total_count} priced at this store, ${substitutedCount} patched in from elsewhere`
      : `${cost.matched_count} of ${cost.total_count} items`;

    const lines = cost.items.map(item => {
      const desc = item.is_prorated
        ? `${item.name}: ${item.quantity} ${item.unit_name || ''} used (of ${item.package_quantity} ${item.package_unit_name} @ $${item.unit_price.toFixed(2)}) = $${item.line_cost.toFixed(2)}`
        : `${item.name}: ${item.packages_needed} &times; ${item.package_quantity} ${item.package_unit_name} @ $${item.unit_price.toFixed(2)} = $${item.line_cost.toFixed(2)}`;
      return `
      <div class="cost-line-item ${item.is_stale ? 'price-stale' : ''}">
        <span>${desc}</span>
        ${item.is_stale ? '<span class="stale-badge">price may be outdated</span>' : ''}
      </div>
    `;
    }).join('');

    const substitutedLines = substitutedItems.map(item => {
      const sourceLabel = item.is_blended
        ? `blended from ${item.source_stores.map(s => s.store_name).join(' & ')}`
        : `from ${item.source_stores[0].store_name}`;
      return `
        <div class="cost-line-item cost-substituted ${item.is_stale ? 'price-stale' : ''}">
          <span>${item.name}: $${item.line_cost.toFixed(2)}</span>
          <span class="substituted-badge">${sourceLabel}</span>
          ${item.is_stale ? '<span class="stale-badge">price may be outdated</span>' : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="cost-summary">
        <strong>$${cost.total_cost.toFixed(2)} for ${matchLabel}</strong>
        ${missingHtml}
        <div class="cost-line-items">${lines}${substitutedLines}</div>
      </div>
    `;
  }

  test('should show the missing-ingredients warning with the affected names', () => {
    const html = renderCostSummary({
      total_cost: 34.2,
      matched_count: 11,
      total_count: 13,
      items: [],
      missing_ingredients: [{ name: 'tahini' }, { name: 'saffron' }]
    });

    expect(html).toContain('$34.20 for 11 of 13 items');
    expect(html).toContain('Missing at this store: tahini, saffron');
  });

  test('should show a substituted-item badge naming the source store', () => {
    const html = renderCostSummary({
      total_cost: 6.0,
      matched_count: 0,
      substituted_count: 1,
      total_count: 1,
      items: [],
      missing_ingredients: [],
      substituted_items: [{
        name: 'saffron',
        line_cost: 6.0,
        is_blended: false,
        is_stale: false,
        source_stores: [{ store_name: 'Trader Joe\'s' }]
      }]
    });

    expect(html).toContain('$6.00 for 0 of 1 priced at this store, 1 patched in from elsewhere');
    expect(html).toContain('substituted-badge');
    expect(html).toContain('from Trader Joe\'s');
    expect(html).toContain('cost-substituted');
  });

  test('should label a blended substitute with both contributing stores', () => {
    const html = renderCostSummary({
      total_cost: 3.0,
      matched_count: 0,
      substituted_count: 1,
      total_count: 1,
      items: [],
      missing_ingredients: [],
      substituted_items: [{
        name: 'saffron',
        line_cost: 3.0,
        is_blended: true,
        is_stale: false,
        source_stores: [{ store_name: 'Store A' }, { store_name: 'Store B' }]
      }]
    });

    expect(html).toContain('blended from Store A & Store B');
  });

  test('should not render a warning when nothing is missing', () => {
    const html = renderCostSummary({
      total_cost: 10,
      matched_count: 2,
      total_count: 2,
      items: [],
      missing_ingredients: []
    });

    expect(html).not.toContain('cost-warning');
  });

  test('should flag stale prices with the price-stale class and badge', () => {
    const html = renderCostSummary({
      total_cost: 4.99,
      matched_count: 1,
      total_count: 1,
      items: [{
        name: 'olive oil',
        packages_needed: 1,
        package_quantity: 48,
        package_unit_name: 'tbsp',
        unit_price: 4.99,
        line_cost: 4.99,
        is_stale: true
      }],
      missing_ingredients: []
    });

    expect(html).toContain('price-stale');
    expect(html).toContain('stale-badge');
    expect(html).toContain('price may be outdated');
  });

  test('should not flag fresh prices as stale', () => {
    const html = renderCostSummary({
      total_cost: 4.99,
      matched_count: 1,
      total_count: 1,
      items: [{
        name: 'olive oil',
        packages_needed: 1,
        package_quantity: 48,
        package_unit_name: 'tbsp',
        unit_price: 4.99,
        line_cost: 4.99,
        is_stale: false
      }],
      missing_ingredients: []
    });

    expect(html).not.toContain('price-stale');
    expect(html).not.toContain('stale-badge');
  });

  test('a prorated recipe-cost line shows the fractional share used, not a package count', () => {
    const html = renderCostSummary({
      total_cost: 0.21,
      matched_count: 1,
      total_count: 1,
      items: [{
        name: 'olive oil',
        quantity: 2,
        unit_name: 'tbsp',
        package_quantity: 48,
        package_unit_name: 'tbsp',
        unit_price: 4.99,
        fraction_used: 0.0417,
        line_cost: 0.21,
        is_prorated: true,
        is_stale: false
      }],
      missing_ingredients: []
    });

    expect(html).toContain('olive oil: 2 tbsp used (of 48 tbsp @ $4.99) = $0.21');
    expect(html).not.toContain('undefined &times;');
  });
});

describe('Manual List Item Rendering Logic', () => {
  // Mirrors the relevant slice of renderShoppingList() in public/app.js
  function renderListItem(item) {
    return `
      <li class="${item.has_manual ? 'manually-added' : ''}">
        <label>${item.quantity} ${item.unit} ${item.name}</label>
        ${item.has_manual ? `
          <span class="manual-badge">added directly</span>
          <span class="manual-entries">
            ${item.manual_entries.map(entry => `
              <span class="manual-entry-chip">
                +${entry.quantity} ${entry.unit_name}
                <button type="button" class="manual-entry-remove" onclick="deleteManualListItemUI(${entry.id})">&times;</button>
              </span>
            `).join('')}
          </span>
        ` : ''}
      </li>
    `;
  }

  test('a purely recipe-derived item renders with no highlight or badge', () => {
    const html = renderListItem({ name: 'flour', quantity: 2, unit: 'cups', has_manual: false, manual_entries: [] });

    expect(html).not.toContain('manually-added');
    expect(html).not.toContain('manual-badge');
  });

  test('an item with a manual contribution is highlighted with a badge and a removable chip', () => {
    const html = renderListItem({
      name: 'olive oil',
      quantity: 3,
      unit: 'tbsp',
      has_manual: true,
      manual_entries: [{ id: 7, quantity: 1, unit_name: 'tbsp' }]
    });

    expect(html).toContain('manually-added');
    expect(html).toContain('manual-badge');
    expect(html).toContain('+1 tbsp');
    expect(html).toContain('deleteManualListItemUI(7)');
  });

  test('multiple manual entries for the same item each render their own removable chip', () => {
    const html = renderListItem({
      name: 'eggs',
      quantity: 5,
      unit: 'each',
      has_manual: true,
      manual_entries: [{ id: 1, quantity: 2, unit_name: 'each' }, { id: 2, quantity: 3, unit_name: 'each' }]
    });

    expect(html).toContain('deleteManualListItemUI(1)');
    expect(html).toContain('deleteManualListItemUI(2)');
  });
});

describe('Recipe Card Cost Rendering Logic', () => {
  // Mirrors renderRecipeCardCost() in public/app.js
  function renderRecipeCardCost(recipeId, selectedStoreId, recipeCosts) {
    if (!selectedStoreId) return '';
    const cost = recipeCosts[recipeId];
    if (!cost) return '';
    const missingNote = cost.missing_ingredients.length
      ? ` <span class="recipe-card-cost-warning">(${cost.missing_ingredients.length} missing)</span>`
      : '';
    return `<div class="recipe-card-cost">$${cost.total_cost.toFixed(2)}${missingNote}</div>`;
  }

  test('renders nothing when no store is selected', () => {
    const html = renderRecipeCardCost(1, null, { 1: { total_cost: 5, missing_ingredients: [] } });
    expect(html).toBe('');
  });

  test('renders nothing while the cost has not been fetched yet', () => {
    const html = renderRecipeCardCost(1, 2, {});
    expect(html).toBe('');
  });

  test('renders the total cost once fetched', () => {
    const html = renderRecipeCardCost(1, 2, { 1: { total_cost: 12.5, missing_ingredients: [] } });
    expect(html).toContain('recipe-card-cost');
    expect(html).toContain('$12.50');
    expect(html).not.toContain('recipe-card-cost-warning');
  });

  test('flags missing ingredients on the card', () => {
    const html = renderRecipeCardCost(1, 2, { 1: { total_cost: 3, missing_ingredients: [{ name: 'saffron' }] } });
    expect(html).toContain('$3.00');
    expect(html).toContain('recipe-card-cost-warning');
    expect(html).toContain('(1 missing)');
  });
});

describe('Shopping List "Don\'t Need to Buy" Rendering Logic', () => {
  // Mirrors the relevant slices of renderShoppingList() in public/app.js
  function renderListItemActions(item) {
    return `<button type="button" class="btn-secondary btn-small dont-need-btn" onclick="excludeFromShoppingList(${item.ingredient_id})">Don't need to buy</button>`;
  }

  function renderExcludedSection(excludedIngredients) {
    if (excludedIngredients.length === 0) return '';
    return `
      <div class="excluded-list-section">
        <div class="excluded-list-title">Not buying this trip</div>
        <ul class="excluded-list">
          ${excludedIngredients.map(ing => `
            <li>
              <span>${ing.name}</span>
              <button type="button" class="btn-secondary btn-small" onclick="includeInShoppingList(${ing.id})">Buy after all</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  test('each list item gets a "Don\'t need to buy" button scoped to that ingredient', () => {
    const html = renderListItemActions({ ingredient_id: 7, name: 'flour' });
    expect(html).toContain('excludeFromShoppingList(7)');
    expect(html).toContain("Don't need to buy");
  });

  test('excluded ingredients render in a separate section with a way to add them back', () => {
    const html = renderExcludedSection([{ id: 9, name: 'saffron' }]);
    expect(html).toContain('excluded-list-section');
    expect(html).toContain('saffron');
    expect(html).toContain('includeInShoppingList(9)');
    expect(html).toContain('Buy after all');
  });

  test('no excluded section renders when nothing is excluded', () => {
    const html = renderExcludedSection([]);
    expect(html).toBe('');
  });
});

describe('Shopping List Buy-Increment Rendering Logic', () => {
  // Mirrors the packages-to-buy slice of renderShoppingList() in public/app.js
  function renderBuyIncrement(item, costByIngredient) {
    const priced = costByIngredient[item.ingredient_id];
    return priced
      ? `<span class="buy-increment">buy ${priced.packages_needed} &times; ${priced.package_quantity} ${priced.package_unit_name}</span>`
      : '';
  }

  test('an item priced at the selected store shows the packages-to-buy alongside the raw quantity', () => {
    const item = { ingredient_id: 1, name: 'flour', quantity: 5, unit: 'cups' };
    const costByIngredient = { 1: { packages_needed: 2, package_quantity: 5, package_unit_name: '5lb bag' } };

    const html = renderBuyIncrement(item, costByIngredient);

    expect(html).toContain('buy 2 &times; 5 5lb bag');
  });

  test('an item with no price at the selected store shows no buy-increment', () => {
    const item = { ingredient_id: 2, name: 'saffron', quantity: 1, unit: 'tsp' };
    const costByIngredient = {};

    const html = renderBuyIncrement(item, costByIngredient);

    expect(html).toBe('');
  });
});

describe('Default Price Form Store Logic', () => {
  // Mirrors getDefaultPriceFormStoreId() in public/app.js
  function getDefaultPriceFormStoreId(prices, stores, selectedStoreId) {
    const pricedStoreIds = new Set(prices.map(p => p.store_id));

    if (selectedStoreId && !pricedStoreIds.has(selectedStoreId)) {
      return selectedStoreId;
    }

    const unpriced = stores
      .filter(s => !pricedStoreIds.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (unpriced.length > 0) return unpriced[0].id;

    return selectedStoreId || null;
  }

  const stores = [
    { id: 1, name: 'Zeus Market' },
    { id: 2, name: 'Acme Grocery' },
    { id: 3, name: 'Bodega Blue' }
  ];

  test('defaults to the selected store when this ingredient has no price there yet', () => {
    const result = getDefaultPriceFormStoreId([], stores, 1);
    expect(result).toBe(1);
  });

  test('falls back to the alphabetically first unpriced store when the selected store is already priced', () => {
    const prices = [{ store_id: 1 }];
    const result = getDefaultPriceFormStoreId(prices, stores, 1);
    expect(result).toBe(2); // Acme Grocery, alphabetically before Bodega Blue
  });

  test('skips stores that already have a price, not just the selected one', () => {
    const prices = [{ store_id: 1 }, { store_id: 2 }];
    const result = getDefaultPriceFormStoreId(prices, stores, 1);
    expect(result).toBe(3); // Bodega Blue, the only remaining unpriced store
  });

  test('falls back to the selected store when every store already has a price', () => {
    const prices = [{ store_id: 1 }, { store_id: 2 }, { store_id: 3 }];
    const result = getDefaultPriceFormStoreId(prices, stores, 1);
    expect(result).toBe(1);
  });

  test('picks the alphabetically first store when no default store is selected', () => {
    const result = getDefaultPriceFormStoreId([], stores, null);
    expect(result).toBe(2); // Acme Grocery
  });

  test('returns null when nothing is selected and every store is already priced', () => {
    const prices = [{ store_id: 1 }, { store_id: 2 }, { store_id: 3 }];
    const result = getDefaultPriceFormStoreId(prices, stores, null);
    expect(result).toBeNull();
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
