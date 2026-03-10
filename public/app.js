// State
let recipes = [];
let cartRecipes = [];
let ingredients = [];
let currentView = 'recipes';
let editingIngredientId = null;

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
  updateIngredientsDatalist();
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

function renderIngredients() {
  const container = document.getElementById('ingredients-grid');

  if (ingredients.length === 0) {
    container.innerHTML = '<p class="empty-state">No ingredients yet. Add your first ingredient!</p>';
    return;
  }

  container.innerHTML = ingredients.map(ing => `
    <div class="ingredient-card" data-id="${ing.id}">
      <div class="ingredient-name" id="ing-name-${ing.id}">${ing.name}</div>
      <input type="text" class="ingredient-edit-input" id="ing-edit-${ing.id}" value="${ing.name}" style="display: none;">
      <div class="ingredient-actions">
        <button onclick="editIngredient(${ing.id})" class="btn-secondary btn-small" id="ing-edit-btn-${ing.id}">Edit</button>
        <button onclick="saveIngredient(${ing.id})" class="btn-primary btn-small" id="ing-save-btn-${ing.id}" style="display: none;">Save</button>
        <button onclick="cancelEditIngredient(${ing.id})" class="btn-secondary btn-small" id="ing-cancel-btn-${ing.id}" style="display: none;">Cancel</button>
        <button onclick="deleteIngredient(${ing.id})" class="btn-danger btn-small">Delete</button>
      </div>
    </div>
  `).join('');
}

function updateIngredientsDatalist() {
  const datalist = document.getElementById('ingredients-datalist');
  datalist.innerHTML = ingredients.map(ing =>
    `<option value="${ing.name}" data-id="${ing.id}">`
  ).join('');
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
    fetchIngredients(); // Ensure ingredients are loaded for autocomplete
  } else if (viewName === 'cart') {
    fetchCart();
  } else if (viewName === 'shopping-list') {
    fetchShoppingList();
  } else if (viewName === 'ingredients') {
    fetchIngredients();
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

// Form handling
function addIngredientRow() {
  const container = document.getElementById('ingredients-list');
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <div class="ingredient-name-container">
      <input type="text" class="ingredient-name" list="ingredients-datalist" placeholder="Ingredient name" required>
      <span class="ingredient-status"></span>
    </div>
    <input type="hidden" class="ingredient-id">
    <input type="number" class="ingredient-quantity" placeholder="Qty" step="0.01" required>
    <input type="text" class="ingredient-unit" placeholder="Unit" required>
    <button type="button" class="btn-remove" onclick="removeIngredient(this)">Remove</button>
  `;
  container.appendChild(row);
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
      <input type="text" class="ingredient-name" list="ingredients-datalist" placeholder="Ingredient name" required>
      <input type="hidden" class="ingredient-id">
      <input type="number" class="ingredient-quantity" placeholder="Qty" step="0.01" required>
      <input type="text" class="ingredient-unit" placeholder="Unit" required>
      <button type="button" class="btn-remove" onclick="removeIngredient(this)">Remove</button>
    </div>
  `;
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

// Helper function to attach ingredient autocomplete handler
function attachIngredientAutocomplete(nameInput) {
  nameInput.addEventListener('input', function() {
    const row = this.closest('.ingredient-row');
    const idInput = row.querySelector('.ingredient-id');
    const statusIndicator = row.querySelector('.ingredient-status');
    const value = this.value.trim();

    // Find matching ingredient
    const matchingIngredient = ingredients.find(ing =>
      ing.name.toLowerCase() === value.toLowerCase()
    );

    if (matchingIngredient) {
      idInput.value = matchingIngredient.id;
      if (statusIndicator) {
        statusIndicator.textContent = '✓ Existing';
        statusIndicator.className = 'ingredient-status existing';
      }
      nameInput.classList.add('existing-ingredient');
      nameInput.classList.remove('new-ingredient');
    } else if (value) {
      idInput.value = '';
      if (statusIndicator) {
        statusIndicator.textContent = '+ New';
        statusIndicator.className = 'ingredient-status new';
      }
      nameInput.classList.add('new-ingredient');
      nameInput.classList.remove('existing-ingredient');
    } else {
      idInput.value = '';
      if (statusIndicator) {
        statusIndicator.textContent = '';
        statusIndicator.className = 'ingredient-status';
      }
      nameInput.classList.remove('existing-ingredient', 'new-ingredient');
    }
  });
}

// Event listeners
document.getElementById('nav-recipes').addEventListener('click', () => showView('recipes'));
document.getElementById('nav-add-recipe').addEventListener('click', () => showView('add-recipe'));
document.getElementById('nav-ingredients').addEventListener('click', () => showView('ingredients'));
document.getElementById('nav-cart').addEventListener('click', () => showView('cart'));
document.getElementById('nav-shopping-list').addEventListener('click', () => showView('shopping-list'));
document.getElementById('nav-export-import').addEventListener('click', () => showView('export-import'));

document.getElementById('add-ingredient-btn').addEventListener('click', () => {
  addIngredientRow();
  // Attach autocomplete to the newly added row
  const rows = document.querySelectorAll('.ingredient-row');
  const lastRow = rows[rows.length - 1];
  attachIngredientAutocomplete(lastRow.querySelector('.ingredient-name'));
});

// Add ingredient form
document.getElementById('ingredient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await addIngredient();
});

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
    const unitInput = row.querySelector('.ingredient-unit');

    const ingredientName = nameInput.value.trim();
    const quantity = parseFloat(quantityInput.value);
    const unit = unitInput.value.trim();

    if (!ingredientName || !quantity || !unit) {
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

    ingredientsData.push({
      ingredient_id: parseInt(ingredientId),
      quantity,
      unit
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

// Initialize
fetchRecipes();
fetchCart();
fetchIngredients();

// Attach autocomplete to initial ingredient row
document.addEventListener('DOMContentLoaded', () => {
  const initialRow = document.querySelector('.ingredient-row');
  if (initialRow) {
    attachIngredientAutocomplete(initialRow.querySelector('.ingredient-name'));
  }
});
