// State
let recipes = [];
let cartRecipes = [];
let currentView = 'recipes';

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

// View management
function showView(viewName) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`${viewName}-view`).classList.add('active');
  document.getElementById(`nav-${viewName}`).classList.add('active');

  currentView = viewName;

  if (viewName === 'recipes') {
    fetchRecipes();
  } else if (viewName === 'cart') {
    fetchCart();
  } else if (viewName === 'shopping-list') {
    fetchShoppingList();
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

// Form handling
function addIngredientRow() {
  const container = document.getElementById('ingredients-list');
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ingredient-name" placeholder="Ingredient name" required>
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
      <input type="text" class="ingredient-name" placeholder="Ingredient name" required>
      <input type="number" class="ingredient-quantity" placeholder="Qty" step="0.01" required>
      <input type="text" class="ingredient-unit" placeholder="Unit" required>
      <button type="button" class="btn-remove" onclick="removeIngredient(this)">Remove</button>
    </div>
  `;
}

// Event listeners
document.getElementById('nav-recipes').addEventListener('click', () => showView('recipes'));
document.getElementById('nav-add-recipe').addEventListener('click', () => showView('add-recipe'));
document.getElementById('nav-cart').addEventListener('click', () => showView('cart'));
document.getElementById('nav-shopping-list').addEventListener('click', () => showView('shopping-list'));

document.getElementById('add-ingredient-btn').addEventListener('click', addIngredientRow);

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
  const ingredients = Array.from(ingredientRows).map(row => ({
    name: row.querySelector('.ingredient-name').value,
    quantity: parseFloat(row.querySelector('.ingredient-quantity').value),
    unit: row.querySelector('.ingredient-unit').value
  }));

  if (ingredients.length === 0) {
    alert('Please add at least one ingredient');
    return;
  }

  await createRecipe({ name, servings, prep_time, instructions, ingredients });
  clearRecipeForm();
  showView('recipes');
});

// Initialize
fetchRecipes();
fetchCart();
