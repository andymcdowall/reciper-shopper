const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  getAllRecipes,
  getRecipeWithIngredients,
  createRecipeWithIngredients,
  deleteRecipe,
  getCartRecipes,
  addToCart,
  removeFromCart,
  getAggregatedShoppingList
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Recipe routes
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = getAllRecipes.all();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const recipe = getRecipeWithIngredients(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const { name, servings, prep_time, instructions, ingredients } = req.body;

    if (!name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Name and at least one ingredient are required' });
    }

    const recipeId = createRecipeWithIngredients({
      name,
      servings: servings || null,
      prep_time: prep_time || null,
      instructions: instructions || '',
      ingredients
    });

    const recipe = getRecipeWithIngredients(recipeId);
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const result = deleteRecipe.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cart routes
app.get('/api/cart', (req, res) => {
  try {
    const recipes = getCartRecipes.all();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/:recipeId', (req, res) => {
  try {
    addToCart.run(req.params.recipeId);
    res.json({ message: 'Recipe added to cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:recipeId', (req, res) => {
  try {
    const result = removeFromCart.run(req.params.recipeId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not in cart' });
    }
    res.json({ message: 'Recipe removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shopping list route
app.get('/api/shopping-list', (req, res) => {
  try {
    const shoppingList = getAggregatedShoppingList();
    res.json(shoppingList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe Shopper server running on port ${PORT}`);
});
