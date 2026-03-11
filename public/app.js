// State
let recipes = [];
let cartRecipes = [];
let ingredients = [];
let units = [];
let ingredientConversions = {}; // keyed by ingredient_id
let currentView = 'recipes';
let editingIngredientId = null;
let editingUnitId = null;

// API functions
async function fetchRecipes() {
  const response = await fetch('/api/recipes');
  recipes = await response.json();
  renderRecipes();
  updateCartCount();
}

async function fetchRecipe(id) {
  const response = await fetch(`/api/recipes/${id}`);
  return await response.json();
}

async function createRecipe(recipeData) {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData)
  });
  return await response.json();
}

async function deleteRecipeById(id) {
  await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
}

async function fetchCart() {
  const response = await fetch('/api/cart');
  cartRecipes = await response.json();
  renderCart();
  updateCartCount();
}

async function addRecipeToCart(recipeId) {
  await fetch(`/api/cart/${recipeId}`, { method: 'POST' });
  await fetchCart();
}

async function removeRecipeFromCart(recipeId) {
  await fetch(`/api/cart/${recipeId}`, { method: 'DELETE' });
  await fetchCart();
}

async function fetchShoppingList() {
  const response = await fetch('/api/shopping-list');
  const items = await response.json();
  renderShoppingList(items);
}

// Ingredient API functions
async function fetchIngredients() {
  const response = await fetch('/api/ingredients');
  ingredients = await response.json();
  renderIngredients();
}

async function createIngredientAPI(name) {
  const response = await fetch('/api/ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create ingredient');
  }
  return await response.json();
}

async function updateIngredientAPI(id, name) {
  const response = await fetch(`/api/ingredients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return await response.json();
}

async function deleteIngredientAPI(id) {
  await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
}

async function updateIngredientPreferredUnitAPI(id, preferred_unit_id) {
  const response = await fetch(`/api/ingredients/${id}/preferred-unit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferred_unit_id })
  });
  return await response.json();
}

// Unit API functions
async function fetchUnits() {
  const response = await fetch('/api/units');
  units = await response.json();
}

async function createUnitAPI(name, category, base_unit_id, to_base_factor) {
  const response = await fetch('/api/units', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, base_unit_id, to_base_factor })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create unit');
  }
  return await response.json();
}

async function updateUnitAPI(id, name, category, base_unit_id, to_base_factor) {
  const response = await fetch(`/api/units/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, base_unit_id, to_base_factor })
  });
  return await response.json();
}

async function deleteUnitAPI(id) {
  await fetch(`/api/units/${id}`, { method: 'DELETE' });
}

// Ingredient conversion API functions
async function fetchIngredientConversions(ingredientId) {
  const response = await fetch(`/api/ingredients/${ingredientId}/conversions`);
  const conversions = await response.json();
  ingredientConversions[ingredientId] = conversions;
  return conversions;
}

async function createIngredientConversionAPI(ingredientId, from_unit_id, to_unit_id, factor) {
  const response = await fetch(`/api/ingredients/${ingredientId}/conversions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_unit_id, to_unit_id, factor })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create conversion');
  }
  return await response.json();
}

async function deleteIngredientConversionAPI(ingredientId, conversionId) {
  await fetch(`/api/ingredients/${ingredientId}/conversions/${conversionId}`, { method: 'DELETE' });
}

// Rendering functions
function renderRecipes() {
  const container = document.getElementById('recipes-list');

  if (recipes.length === 0) {
    container.innerHTML = '<p class="empty-state">No recipes yet. Add your first recipe!</p>';
    return;
  }

  container.innerHTML = recipes.map(recipe => `
    <div class="recipe-card">
      <h3>${recipe.name}</h3>
      <div class="recipe-meta">
        ${recipe.servings ? `<span>Servings: ${recipe.servings}</span>` : ''}
        ${recipe.prep_time ? `<span>Prep: ${recipe.prep_time} min</span>` : ''}
      </div>
      <div class="recipe-actions">
        <button onclick="viewRecipeDetails(${recipe.id})" class="btn-secondary">View</button>
        <button onclick="addRecipeToCart(${recipe.id})" class="btn-primary">Add to Cart</button>
        <button onclick="deleteRecipe(${recipe.id})" class="btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderCart() {
  const container = document.getElementById('cart-list');

  if (cartRecipes.length === 0) {
    container.innerHTML = '<p class="empty-state">Your cart is empty. Add some recipes!</p>';
    return;
  }

  container.innerHTML = cartRecipes.map(recipe => `
    <div class="recipe-card">
      <h3>${recipe.name}</h3>
      <div class="recipe-meta">
        ${recipe.servings ? `<span>Servings: ${recipe.servings}</span>` : ''}
        ${recipe.prep_time ? `<span>Prep: ${recipe.prep_time} min</span>` : ''}
      </div>
      <div class="recipe-actions">
        <button onclick="viewRecipeDetails(${recipe.id})" class="btn-secondary">View</button>
        <button onclick="removeRecipeFromCart(${recipe.id})" class="btn-danger">Remove</button>
      </div>
    </div>
  `).join('');
}

function renderShoppingList(items) {
  const container = document.getElementById('shopping-list-items');

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">No items in shopping list. Add recipes to your cart first!</p>';
    return;
  }

  container.innerHTML = `
    <ul class="shopping-list">
      ${items.map(item => `
        <li>
          <input type="checkbox" id="item-${item.name}">
          <label for="item-${item.name}">
            ${item.quantity} ${item.unit} ${item.name}
          </label>
        </li>
      `).join('')}
    </ul>
  `;
}

async function renderIngredients() {
  const container = document.getElementById('ingredients-grid');

  if (ingredients.length === 0) {
    container.innerHTML = '<p class="empty-state">No ingredients yet. Add your first ingredient!</p>';
    return;
  }

  // Fetch conversions for all ingredients
  for (const ing of ingredients) {
    if (!ingredientConversions[ing.id]) {
      await fetchIngredientConversions(ing.id);
    }
  }

  container.innerHTML = ingredients.map(ing => {
    const conversions = ingredientConversions[ing.id] || [];
    const baseUnits = units.filter(u => u.base_unit_id === null);
    const preferredUnit = units.find(u => u.id === ing.preferred_unit_id);

    return `
    <div class="ingredient-card" data-id="${ing.id}">
      <div class="ingredient-name" id="ing-name-${ing.id}">${ing.name}</div>
      <input type="text" class="ingredient-edit-input" id="ing-edit-${ing.id}" value="${ing.name}" style="display: none;">
      <div class="ingredient-actions">
        <button onclick="editIngredient(${ing.id})" class="btn-secondary btn-small" id="ing-edit-btn-${ing.id}">Edit</button>
        <button onclick="saveIngredient(${ing.id})" class="btn-primary btn-small" id="ing-save-btn-${ing.id}" style="display: none;">Save</button>
        <button onclick="cancelEditIngredient(${ing.id})" class="btn-secondary btn-small" id="ing-cancel-btn-${ing.id}" style="display: none;">Cancel</button>
        <button onclick="deleteIngredient(${ing.id})" class="btn-danger btn-small">Delete</button>
      </div>

      <!-- Preferred Unit -->
      <div class="ingredient-preferred-unit">
        <div class="preferred-unit-label">Preferred Unit (for shopping list):</div>
        <select class="preferred-unit-select" id="preferred-unit-${ing.id}" onchange="updatePreferredUnit(${ing.id}, this.value)">
          <option value="">None</option>
          ${units.map(u => `<option value="${u.id}" ${u.id === ing.preferred_unit_id ? 'selected' : ''}>${u.name} (${u.category})</option>`).join('')}
        </select>
      </div>

      <!-- Conversions -->
      <div class="ingredient-conversions" id="conversions-${ing.id}">
        <div class="conversions-header">
          <div class="conversions-title">Cross-Category Conversions</div>
          <button onclick="toggleConversionForm(${ing.id})" class="btn-secondary btn-small" id="toggle-conv-${ing.id}">+ Add</button>
        </div>
        <div class="conversion-list">
          ${conversions.map(c => `
            <div class="conversion-item">
              <span>1 ${c.from_unit_name} = ${c.factor} ${c.to_unit_name}</span>
              <button class="conversion-delete-btn" onclick="deleteConversion(${ing.id}, ${c.id})">Delete</button>
            </div>
          `).join('')}
          ${conversions.length === 0 ? '<p style="font-size: 0.85rem; color: #999;">No cross-category conversions</p>' : ''}
        </div>
        <div class="conversion-add-form" id="conv-form-${ing.id}" style="display: none;">
          <select id="conv-from-${ing.id}">
            <option value="">From unit...</option>
            ${baseUnits.map(u => `<option value="${u.id}">${u.name} (${u.category})</option>`).join('')}
          </select>
          <select id="conv-to-${ing.id}">
            <option value="">To unit...</option>
            ${baseUnits.map(u => `<option value="${u.id}">${u.name} (${u.category})</option>`).join('')}
          </select>
          <input type="number" id="conv-factor-${ing.id}" placeholder="Factor" step="0.000001">
          <button class="btn-primary btn-small" onclick="addConversion(${ing.id})">Add</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function renderUnits() {
  const container = document.getElementById('units-grid');

  if (units.length === 0) {
    container.innerHTML = '<p class="empty-state">No units yet. Add your first unit!</p>';
    return;
  }

  container.innerHTML = units.map(unit => {
    const baseUnit = unit.base_unit_id ? units.find(u => u.id === unit.base_unit_id) : null;
    const conversionText = baseUnit
      ? `1 ${unit.name} = ${unit.to_base_factor} ${baseUnit.name}`
      : 'Base unit';

    return `
    <div class="unit-card" data-id="${unit.id}">
      <div class="unit-header">
        <div class="unit-name" id="unit-name-${unit.id}">${unit.name}</div>
        <span class="unit-category-badge ${unit.category}">${unit.category}</span>
      </div>
      <div class="unit-conversion" id="unit-conv-${unit.id}">${conversionText}</div>
      <div class="unit-edit-form" id="unit-edit-${unit.id}" style="display: none;">
        <input type="text" id="unit-edit-name-${unit.id}" value="${unit.name}">
        <select id="unit-edit-category-${unit.id}">
          <option value="volume" ${unit.category === 'volume' ? 'selected' : ''}>Volume</option>
          <option value="mass" ${unit.category === 'mass' ? 'selected' : ''}>Mass</option>
          <option value="length" ${unit.category === 'length' ? 'selected' : ''}>Length</option>
          <option value="count" ${unit.category === 'count' ? 'selected' : ''}>Count</option>
        </select>
        <select id="unit-edit-base-${unit.id}">
          <option value="">Base unit</option>
          ${units.filter(u => u.base_unit_id === null && u.id !== unit.id).map(u => `
            <option value="${u.id}" ${unit.base_unit_id === u.id ? 'selected' : ''}>${u.name}</option>
          `).join('')}
        </select>
        <input type="number" id="unit-edit-factor-${unit.id}" value="${unit.to_base_factor || ''}" placeholder="Conversion factor" step="0.000001">
      </div>
      <div class="unit-actions">
        <button onclick="editUnit(${unit.id})" class="btn-secondary btn-small" id="unit-edit-btn-${unit.id}">Edit</button>
        <button onclick="saveUnit(${unit.id})" class="btn-primary btn-small" id="unit-save-btn-${unit.id}" style="display: none;">Save</button>
        <button onclick="cancelEditUnit(${unit.id})" class="btn-secondary btn-small" id="unit-cancel-btn-${unit.id}" style="display: none;">Cancel</button>
        <button onclick="deleteUnit(${unit.id})" class="btn-danger btn-small">Delete</button>
      </div>
    </div>
  `;
  }).join('');

  // Update the base unit dropdown in the add form
  updateBaseUnitDropdown();
}


// View management
function showView(viewName) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`${viewName}-view`).classList.add('active');
  document.getElementById(`nav-${viewName}`).classList.add('active');

  currentView = viewName;

  if (viewName === 'recipes') {
    fetchRecipes();
  } else if (viewName === 'add-recipe') {
    Promise.all([fetchIngredients(), fetchUnits()]);  // Ensure both are loaded for autocomplete
  } else if (viewName === 'cart') {
    fetchCart();
  } else if (viewName === 'shopping-list') {
    fetchShoppingList();
  } else if (viewName === 'ingredients') {
    Promise.all([fetchIngredients(), fetchUnits()]).then(() => renderIngredients());
  } else if (viewName === 'units') {
    fetchUnits().then(() => renderUnits());
  } else if (viewName === 'export-import') {
    // Clear any previous import results
    document.getElementById('import-result').innerHTML = '';
    document.getElementById('import-file').value = '';
    document.getElementById('import-btn').disabled = true;
  }
}

function updateCartCount() {
  document.getElementById('cart-count').textContent = cartRecipes.length;
}

// Recipe actions
async function viewRecipeDetails(id) {
  const recipe = await fetchRecipe(id);

  const ingredientsList = recipe.ingredients.map(ing =>
    `${ing.quantity} ${ing.unit} ${ing.name}`
  ).join('\n');

  alert(`${recipe.name}\n\nServings: ${recipe.servings || 'N/A'}\nPrep Time: ${recipe.prep_time || 'N/A'} min\n\nIngredients:\n${ingredientsList}\n\nInstructions:\n${recipe.instructions || 'None'}`);
}

async function deleteRecipe(id) {
  if (!confirm('Are you sure you want to delete this recipe?')) return;

  await deleteRecipeById(id);
  await fetchRecipes();
}

// Ingredient actions
async function addIngredient() {
  const nameInput = document.getElementById('new-ingredient-name');
  const name = nameInput.value.trim();

  if (!name) return;

  try {
    await createIngredientAPI(name);
    nameInput.value = '';
    await fetchIngredients();
  } catch (error) {
    alert('Failed to add ingredient: ' + error.message);
  }
}

function editIngredient(id) {
  editingIngredientId = id;
  document.getElementById(`ing-name-${id}`).style.display = 'none';
  document.getElementById(`ing-edit-${id}`).style.display = 'block';
  document.getElementById(`ing-edit-btn-${id}`).style.display = 'none';
  document.getElementById(`ing-save-btn-${id}`).style.display = 'inline-block';
  document.getElementById(`ing-cancel-btn-${id}`).style.display = 'inline-block';
  document.getElementById(`ing-edit-${id}`).focus();
}

async function saveIngredient(id) {
  const newName = document.getElementById(`ing-edit-${id}`).value.trim();

  if (!newName) {
    alert('Ingredient name cannot be empty');
    return;
  }

  await updateIngredientAPI(id, newName);
  editingIngredientId = null;
  await fetchIngredients();
  await fetchRecipes(); // Refresh recipes to show updated ingredient names
}

function cancelEditIngredient(id) {
  editingIngredientId = null;
  const ingredient = ingredients.find(ing => ing.id === id);
  document.getElementById(`ing-edit-${id}`).value = ingredient.name;
  document.getElementById(`ing-name-${id}`).style.display = 'block';
  document.getElementById(`ing-edit-${id}`).style.display = 'none';
  document.getElementById(`ing-edit-btn-${id}`).style.display = 'inline-block';
  document.getElementById(`ing-save-btn-${id}`).style.display = 'none';
  document.getElementById(`ing-cancel-btn-${id}`).style.display = 'none';
}

async function deleteIngredient(id) {
  if (!confirm('Are you sure you want to delete this ingredient? It will be removed from all recipes that use it.')) return;

  await deleteIngredientAPI(id);
  await fetchIngredients();
  await fetchRecipes(); // Refresh recipes in case any were affected
}

// Ingredient conversion actions
async function updatePreferredUnit(ingredientId, unitId) {
  const preferred_unit_id = unitId ? parseInt(unitId) : null;
  await updateIngredientPreferredUnitAPI(ingredientId, preferred_unit_id);
  await fetchIngredients();
}

function toggleConversionForm(ingredientId) {
  const form = document.getElementById(`conv-form-${ingredientId}`);
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

async function addConversion(ingredientId) {
  const fromUnitId = parseInt(document.getElementById(`conv-from-${ingredientId}`).value);
  const toUnitId = parseInt(document.getElementById(`conv-to-${ingredientId}`).value);
  const factor = parseFloat(document.getElementById(`conv-factor-${ingredientId}`).value);

  if (!fromUnitId || !toUnitId || !factor) {
    alert('Please fill in all conversion fields');
    return;
  }

  try {
    await createIngredientConversionAPI(ingredientId, fromUnitId, toUnitId, factor);
    await fetchIngredientConversions(ingredientId);
    await renderIngredients();
  } catch (error) {
    alert('Failed to add conversion: ' + error.message);
  }
}

async function deleteConversion(ingredientId, conversionId) {
  if (!confirm('Are you sure you want to delete this conversion?')) return;

  await deleteIngredientConversionAPI(ingredientId, conversionId);
  await fetchIngredientConversions(ingredientId);
  await renderIngredients();
}

// Unit actions
async function addUnit() {
  const name = document.getElementById('new-unit-name').value.trim();
  const category = document.getElementById('new-unit-category').value;
  const base_unit_id = document.getElementById('new-unit-base').value;
  const to_base_factor = document.getElementById('new-unit-factor').value;

  if (!name || !category) {
    alert('Unit name and category are required');
    return;
  }

  if (base_unit_id && !to_base_factor) {
    alert('Conversion factor is required when base unit is selected');
    return;
  }

  try {
    await createUnitAPI(
      name,
      category,
      base_unit_id ? parseInt(base_unit_id) : null,
      to_base_factor ? parseFloat(to_base_factor) : null
    );
    document.getElementById('new-unit-name').value = '';
    document.getElementById('new-unit-category').value = '';
    document.getElementById('new-unit-base').value = '';
    document.getElementById('new-unit-factor').value = '';
    await fetchUnits();
    renderUnits();
  } catch (error) {
    alert('Failed to add unit: ' + error.message);
  }
}

function editUnit(id) {
  editingUnitId = id;
  document.getElementById(`unit-name-${id}`).style.display = 'none';
  document.getElementById(`unit-conv-${id}`).style.display = 'none';
  document.getElementById(`unit-edit-${id}`).style.display = 'flex';
  document.getElementById(`unit-edit-btn-${id}`).style.display = 'none';
  document.getElementById(`unit-save-btn-${id}`).style.display = 'inline-block';
  document.getElementById(`unit-cancel-btn-${id}`).style.display = 'inline-block';
}

async function saveUnit(id) {
  const name = document.getElementById(`unit-edit-name-${id}`).value.trim();
  const category = document.getElementById(`unit-edit-category-${id}`).value;
  const base_unit_id = document.getElementById(`unit-edit-base-${id}`).value;
  const to_base_factor = document.getElementById(`unit-edit-factor-${id}`).value;

  if (!name || !category) {
    alert('Unit name and category cannot be empty');
    return;
  }

  await updateUnitAPI(
    id,
    name,
    category,
    base_unit_id ? parseInt(base_unit_id) : null,
    to_base_factor ? parseFloat(to_base_factor) : null
  );
  editingUnitId = null;
  await fetchUnits();
  renderUnits();
}

function cancelEditUnit(id) {
  editingUnitId = null;
  renderUnits();
}

async function deleteUnit(id) {
  if (!confirm('Are you sure you want to delete this unit? It may be referenced by recipes.')) return;

  try {
    await deleteUnitAPI(id);
    await fetchUnits();
    renderUnits();
  } catch (error) {
    alert('Failed to delete unit. It may be in use by recipes: ' + error.message);
  }
}

function updateBaseUnitDropdown() {
  const select = document.getElementById('new-unit-base');
  const category = document.getElementById('new-unit-category').value;

  if (!category) {
    select.innerHTML = '<option value="">Base unit (optional)</option>';
    return;
  }

  const baseUnits = units.filter(u => u.base_unit_id === null && u.category === category);
  select.innerHTML = '<option value="">Base unit (optional)</option>' +
    baseUnits.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

// Form handling
function addIngredientRow() {
  const container = document.getElementById('ingredients-list');
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <div class="ingredient-name-container">
      <input type="text" class="ingredient-name" placeholder="Ingredient name" required autocomplete="off">
    </div>
    <input type="hidden" class="ingredient-id">
    <input type="number" class="ingredient-quantity" placeholder="Qty" step="0.01" required>
    <div class="unit-container">
      <input type="text" class="unit-name" placeholder="Unit" required autocomplete="off">
    </div>
    <input type="hidden" class="unit-id">
    <button type="button" class="btn-remove" onclick="removeIngredient(this)">Remove</button>
  `;
  container.appendChild(row);

  // Attach autocomplete to the new row
  const nameInput = row.querySelector('.ingredient-name');
  const unitNameInput = row.querySelector('.unit-name');
  attachIngredientAutocomplete(nameInput);
  attachUnitAutocomplete(unitNameInput);
}

function removeIngredient(button) {
  const container = document.getElementById('ingredients-list');
  if (container.children.length > 1) {
    button.parentElement.remove();
  } else {
    alert('You must have at least one ingredient');
  }
}

function clearRecipeForm() {
  document.getElementById('recipe-form').reset();
  const container = document.getElementById('ingredients-list');
  container.innerHTML = `
    <div class="ingredient-row">
      <div class="ingredient-name-container">
        <input type="text" class="ingredient-name" placeholder="Ingredient name" required autocomplete="off">
      </div>
      <input type="hidden" class="ingredient-id">
      <input type="number" class="ingredient-quantity" placeholder="Qty" step="0.01" required>
      <div class="unit-container">
        <input type="text" class="unit-name" placeholder="Unit" required autocomplete="off">
      </div>
      <input type="hidden" class="unit-id">
      <button type="button" class="btn-remove" onclick="removeIngredient(this)">Remove</button>
    </div>
  `;

  // Re-attach autocomplete to the reset row
  const row = container.querySelector('.ingredient-row');
  if (row) {
    attachIngredientAutocomplete(row.querySelector('.ingredient-name'));
    attachUnitAutocomplete(row.querySelector('.unit-name'));
  }
}

// Export/Import functions
async function exportRecipes() {
  try {
    const response = await fetch('/api/export');
    const data = await response.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipes-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Failed to export recipes: ' + error.message);
  }
}

async function importRecipes() {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file to import');
    return;
  }

  const mode = document.querySelector('input[name="import-mode"]:checked').value;

  // Confirm overwrite mode
  if (mode === 'overwrite' && !confirm('WARNING: This will delete ALL existing recipes and replace them with the imported ones. Are you sure?')) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.recipes || !Array.isArray(data.recipes)) {
      throw new Error('Invalid file format: missing recipes array');
    }

    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipes: data.recipes, mode })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Import failed');
    }

    // Display results
    const resultDiv = document.getElementById('import-result');
    resultDiv.innerHTML = `
      <div class="success-message">
        <strong>Import completed!</strong><br>
        Imported: ${result.imported} recipe(s)<br>
        ${result.skipped > 0 ? `Skipped: ${result.skipped} recipe(s) (duplicates or invalid)` : ''}
      </div>
    `;

    // Refresh recipes list
    await fetchRecipes();

    // Clear the file input
    fileInput.value = '';
    document.getElementById('import-btn').disabled = true;
  } catch (error) {
    const resultDiv = document.getElementById('import-result');
    resultDiv.innerHTML = `
      <div class="error-message">
        <strong>Import failed:</strong><br>
        ${error.message}
      </div>
    `;
  }
}

/**
 * Generic autocomplete dropdown helper
 *
 * @param {HTMLInputElement} input - The input element to attach autocomplete to
 * @param {Object} options - Configuration options
 * @param {Array|Function} options.dataSource - Array of items or function returning array
 * @param {Function} options.filterFn - Filter function: (items, value) => filtered items
 * @param {Function} options.renderItem - Render function: (item) => html string
 * @param {Function} [options.renderAddNew] - Optional render "add new": (value, matches) => html string or null
 * @param {Function} options.onSelect - Selection callback: (data, input, hiddenInput) => void
 * @param {HTMLInputElement} [options.hiddenInput] - Optional hidden input for storing ID
 * @returns {Object} { updateDropdown, dropdown }
 *
 * @example
 * // Simple autocomplete with countries
 * const countries = ['USA', 'Canada', 'Mexico', 'France', 'Germany'];
 * createAutocomplete(countryInput, {
 *   dataSource: countries,
 *   filterFn: (items, value) => items.filter(c => c.toLowerCase().includes(value.toLowerCase())),
 *   renderItem: (country) => `<div class="autocomplete-item" data-name="${country}">${country}</div>`,
 *   onSelect: (data, input) => { input.value = data.name; }
 * });
 *
 * @example
 * // Autocomplete with IDs and "add new" option
 * createAutocomplete(userInput, {
 *   dataSource: () => users, // Dynamic data source
 *   filterFn: (items, value) => items.filter(u => u.email.includes(value)),
 *   renderItem: (user) => `<div class="autocomplete-item" data-id="${user.id}" data-email="${user.email}">
 *     ${user.name} (${user.email})
 *   </div>`,
 *   renderAddNew: (value) => `<div class="autocomplete-item add-new" data-email="${value}">
 *     <span class="item-icon">+</span> Invite "${value}"
 *   </div>`,
 *   onSelect: (data, input, hiddenInput) => {
 *     input.value = data.email;
 *     if (hiddenInput) hiddenInput.value = data.id || '';
 *   },
 *   hiddenInput: document.getElementById('user-id')
 * });
 */
function createAutocomplete(input, options) {
  const {
    dataSource,
    filterFn,
    renderItem,
    renderAddNew,
    onSelect,
    hiddenInput,
    containerSelector
  } = options;

  let dropdown = input.parentElement.querySelector('.autocomplete-dropdown');
  let selectedIndex = -1;

  // Create dropdown if it doesn't exist
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    input.parentElement.appendChild(dropdown);
  }

  function updateDropdown() {
    const value = input.value.trim();

    if (!value) {
      dropdown.style.display = 'none';
      if (hiddenInput) hiddenInput.value = '';
      selectedIndex = -1;
      return;
    }

    // Get data source (can be array or function)
    const data = typeof dataSource === 'function' ? dataSource() : dataSource;

    // Filter items
    const matches = filterFn ? filterFn(data, value) : data;

    // Build dropdown content
    let html = '';

    // Render matching items
    matches.forEach(item => {
      html += renderItem(item);
    });

    // Add "add new" option if provided
    if (renderAddNew) {
      const addNewHtml = renderAddNew(value, matches);
      if (addNewHtml) html += addNewHtml;
    }

    if (html) {
      dropdown.innerHTML = html;
      dropdown.style.display = 'block';
      selectedIndex = -1;

      // Add click handlers to items
      dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', function() {
          selectItem(this);
        });
      });
    } else {
      dropdown.style.display = 'none';
    }
  }

  function selectItem(itemElement) {
    // Parse data from element
    const data = {};
    Array.from(itemElement.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        data[attr.name.substring(5)] = attr.value;
      }
    });

    onSelect(data, input, hiddenInput);
    dropdown.style.display = 'none';
    selectedIndex = -1;
  }

  function highlightItem(index) {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Input event handler
  input.addEventListener('input', updateDropdown);

  // Keyboard navigation
  input.addEventListener('keydown', function(e) {
    if (dropdown.style.display === 'none') return;

    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      highlightItem(selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      highlightItem(selectedIndex);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        selectItem(items[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      selectedIndex = -1;
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      selectedIndex = -1;
    }
  });

  // Show dropdown when focusing
  input.addEventListener('focus', function() {
    if (this.value.trim()) {
      updateDropdown();
    }
  });

  return { updateDropdown, dropdown };
}

// Helper function to attach ingredient autocomplete handler
function attachIngredientAutocomplete(nameInput) {
  const row = nameInput.closest('.ingredient-row');
  const idInput = row.querySelector('.ingredient-id');

  createAutocomplete(nameInput, {
    dataSource: () => ingredients,

    filterFn: (items, value) => {
      return items.filter(ing =>
        ing.name.toLowerCase().includes(value.toLowerCase())
      );
    },

    renderItem: (ing) => {
      return `<div class="autocomplete-item" data-id="${ing.id}" data-name="${ing.name}">
        <span class="item-icon">✓</span> ${ing.name}
      </div>`;
    },

    renderAddNew: (value, matches) => {
      // Only show "Add new" if no exact match exists
      const exactMatch = matches.find(ing => ing.name.toLowerCase() === value.toLowerCase());
      if (!exactMatch) {
        return `<div class="autocomplete-item add-new" data-name="${value}">
          <span class="item-icon">+</span> Add "${value}"
        </div>`;
      }
      return null;
    },

    onSelect: (data, input, hiddenInput) => {
      input.value = data.name;
      if (hiddenInput) {
        hiddenInput.value = data.id || '';
      }
    },

    hiddenInput: idInput
  });
}

// Helper function to attach unit autocomplete handler
function attachUnitAutocomplete(unitNameInput) {
  const row = unitNameInput.closest('.ingredient-row');
  const unitIdInput = row.querySelector('.unit-id');

  createAutocomplete(unitNameInput, {
    dataSource: () => units,

    filterFn: (items, value) => {
      return items.filter(unit =>
        unit.name.toLowerCase().includes(value.toLowerCase())
      );
    },

    renderItem: (unit) => {
      return `<div class="autocomplete-item" data-id="${unit.id}" data-name="${unit.name}">
        <span class="item-icon">✓</span> ${unit.name} <span style="color: #999; font-size: 0.85em;">(${unit.category})</span>
      </div>`;
    },

    renderAddNew: (value) => {
      const exactMatch = units.some(u => u.name.toLowerCase() === value.toLowerCase());
      if (!exactMatch && value.trim()) {
        return `<div class="autocomplete-item add-new" data-name="${value}" data-is-new="true">
          <span class="item-icon">+</span> Add "${value}"
        </div>`;
      }
      return null;
    },

    onSelect: (data, input, hiddenInput) => {
      if (data.isNew === 'true') {
        // Open modal to add new unit
        openAddUnitModal(data.name, unitNameInput, unitIdInput);
      } else {
        input.value = data.name;
        if (hiddenInput) {
          hiddenInput.value = data.id || '';
        }
      }
    },

    hiddenInput: unitIdInput
  });
}

// Modal functions for adding units from recipe form
let modalTargetInputs = { nameInput: null, idInput: null };

function openAddUnitModal(unitName, nameInput, idInput) {
  const modal = document.getElementById('add-unit-modal');
  const form = document.getElementById('add-unit-modal-form');

  // Pre-fill unit name
  document.getElementById('modal-unit-name').value = unitName;

  // Store reference to inputs so we can update them after creation
  modalTargetInputs = { nameInput, idInput };

  // Show modal
  modal.classList.add('show');
  modal.style.display = 'flex';

  // Focus on category field
  document.getElementById('modal-unit-category').focus();
}

function closeAddUnitModal() {
  const modal = document.getElementById('add-unit-modal');
  const form = document.getElementById('add-unit-modal-form');

  // Hide modal
  modal.classList.remove('show');
  modal.style.display = 'none';

  // Reset form
  form.reset();

  // Clear target inputs reference
  modalTargetInputs = { nameInput: null, idInput: null };
}

function updateModalBaseUnitDropdown() {
  const select = document.getElementById('modal-unit-base');
  const category = document.getElementById('modal-unit-category').value;

  if (!category) {
    select.innerHTML = '<option value="">None (this is a base unit)</option>';
    return;
  }

  const baseUnits = units.filter(u => u.base_unit_id === null && u.category === category);
  select.innerHTML = '<option value="">None (this is a base unit)</option>' +
    baseUnits.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

// Event listeners
document.getElementById('nav-recipes').addEventListener('click', () => showView('recipes'));
document.getElementById('nav-add-recipe').addEventListener('click', () => showView('add-recipe'));
document.getElementById('nav-ingredients').addEventListener('click', () => showView('ingredients'));
document.getElementById('nav-units').addEventListener('click', () => showView('units'));
document.getElementById('nav-cart').addEventListener('click', () => showView('cart'));
document.getElementById('nav-shopping-list').addEventListener('click', () => showView('shopping-list'));
document.getElementById('nav-export-import').addEventListener('click', () => showView('export-import'));

document.getElementById('add-ingredient-btn').addEventListener('click', () => {
  addIngredientRow();
});

// Add ingredient form
document.getElementById('ingredient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await addIngredient();
});

// Add unit form
document.getElementById('unit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await addUnit();
});

// Update base unit dropdown when category changes
document.getElementById('new-unit-category').addEventListener('change', updateBaseUnitDropdown);

document.getElementById('cancel-recipe-btn').addEventListener('click', () => {
  clearRecipeForm();
  showView('recipes');
});

document.getElementById('recipe-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('recipe-name').value;
  const servings = parseInt(document.getElementById('recipe-servings').value) || null;
  const prep_time = parseInt(document.getElementById('recipe-prep-time').value) || null;
  const instructions = document.getElementById('recipe-instructions').value;

  const ingredientRows = document.querySelectorAll('.ingredient-row');
  const ingredientsData = [];

  for (const row of ingredientRows) {
    const nameInput = row.querySelector('.ingredient-name');
    const idInput = row.querySelector('.ingredient-id');
    const quantityInput = row.querySelector('.ingredient-quantity');
    const unitNameInput = row.querySelector('.unit-name');
    const unitIdInput = row.querySelector('.unit-id');

    const ingredientName = nameInput.value.trim();
    const quantity = parseFloat(quantityInput.value);
    const unitName = unitNameInput.value.trim();

    if (!ingredientName || !quantity || !unitName) {
      alert('Please fill in all ingredient fields');
      return;
    }

    // Get or create ingredient
    let ingredientId = idInput.value;
    if (!ingredientId) {
      // Check if ingredient exists
      let ingredient = ingredients.find(ing => ing.name.toLowerCase() === ingredientName.toLowerCase());
      if (!ingredient) {
        // Create new ingredient
        ingredient = await createIngredientAPI(ingredientName);
        await fetchIngredients(); // Refresh ingredients list
      }
      ingredientId = ingredient.id;
    }

    // Get unit ID (must exist, no creation from recipe form)
    let unitId = unitIdInput.value;
    if (!unitId) {
      alert(`Unit "${unitName}" not found. Please select an existing unit or create it in the Units tab first.`);
      return;
    }

    ingredientsData.push({
      ingredient_id: parseInt(ingredientId),
      quantity,
      unit_id: parseInt(unitId)
    });
  }

  if (ingredientsData.length === 0) {
    alert('Please add at least one ingredient');
    return;
  }

  await createRecipe({ name, servings, prep_time, instructions, ingredients: ingredientsData });
  clearRecipeForm();
  showView('recipes');
});

// Export/Import event listeners
document.getElementById('export-btn').addEventListener('click', exportRecipes);
document.getElementById('import-btn').addEventListener('click', importRecipes);
document.getElementById('import-file').addEventListener('change', (e) => {
  document.getElementById('import-btn').disabled = !e.target.files[0];
});

// Modal event listeners
document.getElementById('modal-unit-category').addEventListener('change', updateModalBaseUnitDropdown);
document.getElementById('add-unit-modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('modal-unit-name').value.trim();
  const category = document.getElementById('modal-unit-category').value;
  const base_unit_id = document.getElementById('modal-unit-base').value;
  const to_base_factor = document.getElementById('modal-unit-factor').value;

  if (!name || !category) {
    alert('Unit name and category are required');
    return;
  }

  if (base_unit_id && !to_base_factor) {
    alert('Conversion factor is required when base unit is selected');
    return;
  }

  try {
    const newUnit = await createUnitAPI(
      name,
      category,
      base_unit_id ? parseInt(base_unit_id) : null,
      to_base_factor ? parseFloat(to_base_factor) : null
    );

    // Refresh units list
    await fetchUnits();

    // Update the target inputs if they exist
    if (modalTargetInputs.nameInput && modalTargetInputs.idInput) {
      modalTargetInputs.nameInput.value = newUnit.name;
      modalTargetInputs.idInput.value = newUnit.id;
    }

    // Close modal
    closeAddUnitModal();
  } catch (error) {
    alert('Failed to add unit: ' + error.message);
  }
});

// Initialize
fetchRecipes();
fetchCart();
fetchIngredients();
fetchUnits();

// Attach autocomplete to initial ingredient row
document.addEventListener('DOMContentLoaded', () => {
  const initialRow = document.querySelector('.ingredient-row');
  if (initialRow) {
    attachIngredientAutocomplete(initialRow.querySelector('.ingredient-name'));
    attachUnitAutocomplete(initialRow.querySelector('.unit-name'));
  }
});
