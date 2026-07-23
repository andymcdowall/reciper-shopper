const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'recipes.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    servings INTEGER,
    prep_time INTEGER,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category TEXT NOT NULL CHECK(category IN ('volume', 'mass', 'length', 'count')),
    base_unit_id INTEGER,
    to_base_factor REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    preferred_unit_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_unit_id) REFERENCES units(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ingredient_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    from_unit_id INTEGER NOT NULL,
    to_unit_id INTEGER NOT NULL,
    factor REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (from_unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (to_unit_id) REFERENCES units(id) ON DELETE CASCADE,
    UNIQUE(ingredient_id, from_unit_id, to_unit_id)
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_id INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL UNIQUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    package_quantity REAL NOT NULL CHECK(package_quantity > 0),
    package_unit_id INTEGER NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    is_preferred INTEGER NOT NULL DEFAULT 0 CHECK(is_preferred IN (0, 1)),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (package_unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS manual_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
  );
`);

// Migrations
try {
  db.exec(`ALTER TABLE units ADD COLUMN rounding_increment REAL`);
} catch (e) {
  // Column already exists
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_one_preferred
  ON prices(ingredient_id, store_id)
  WHERE is_preferred = 1
`);

// Recipe queries
const getAllRecipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC');

const getRecipeById = db.prepare('SELECT * FROM recipes WHERE id = ?');

const getIngredientsByRecipeId = db.prepare(`
  SELECT i.id, i.name, ri.quantity, ri.unit_id, u.name as unit
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
  INNER JOIN units u ON ri.unit_id = u.id
  WHERE ri.recipe_id = ?
`);

const createRecipe = db.prepare(`
  INSERT INTO recipes (name, servings, prep_time, instructions)
  VALUES (@name, @servings, @prep_time, @instructions)
`);

const createRecipeIngredient = db.prepare(`
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id)
  VALUES (@recipe_id, @ingredient_id, @quantity, @unit_id)
`);

const updateRecipeFields = db.prepare(`
  UPDATE recipes SET name = @name, servings = @servings, prep_time = @prep_time, instructions = @instructions
  WHERE id = @id
`);

const deleteRecipeIngredientsByRecipeId = db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?');

const deleteRecipe = db.prepare('DELETE FROM recipes WHERE id = ?');

// Ingredient queries
const getAllIngredients = db.prepare('SELECT * FROM ingredients ORDER BY name ASC');

const getIngredientById = db.prepare('SELECT * FROM ingredients WHERE id = ?');

const getIngredientByName = db.prepare('SELECT * FROM ingredients WHERE name = ? COLLATE NOCASE');

const createIngredient = db.prepare(`
  INSERT INTO ingredients (name)
  VALUES (@name)
`);

const updateIngredient = db.prepare(`
  UPDATE ingredients SET name = @name WHERE id = @id
`);

const deleteIngredient = db.prepare('DELETE FROM ingredients WHERE id = ?');

const updateIngredientPreferredUnit = db.prepare(`
  UPDATE ingredients SET preferred_unit_id = @preferred_unit_id WHERE id = @id
`);

// Unit queries
const getAllUnits = db.prepare('SELECT * FROM units ORDER BY category, name ASC');

const getUnitById = db.prepare('SELECT * FROM units WHERE id = ?');

const getUnitByName = db.prepare('SELECT * FROM units WHERE name = ? COLLATE NOCASE');

const getUnitsByCategory = db.prepare('SELECT * FROM units WHERE category = ? ORDER BY name ASC');

const getBaseUnits = db.prepare('SELECT * FROM units WHERE base_unit_id IS NULL ORDER BY category ASC');

const createUnit = db.prepare(`
  INSERT INTO units (name, category, base_unit_id, to_base_factor, rounding_increment)
  VALUES (@name, @category, @base_unit_id, @to_base_factor, @rounding_increment)
`);

const updateUnit = db.prepare(`
  UPDATE units SET name = @name, category = @category, base_unit_id = @base_unit_id, to_base_factor = @to_base_factor, rounding_increment = @rounding_increment
  WHERE id = @id
`);

const deleteUnit = db.prepare('DELETE FROM units WHERE id = ?');

const getUnitIdsUsedByRecipes = db.prepare('SELECT DISTINCT unit_id FROM recipe_ingredients');

const getUnitIdsUsedByPrices = db.prepare('SELECT DISTINCT package_unit_id AS unit_id FROM prices');

// A unit is "in use" if a recipe or a price references it directly, or if it's the base unit of
// another unit that is itself in use (units.base_unit_id is ON DELETE RESTRICT, so that base
// can't be deleted while a surviving derived unit still points to it).
function getInUseUnitIds() {
  const directlyInUse = new Set([
    ...getUnitIdsUsedByRecipes.all().map(r => r.unit_id),
    ...getUnitIdsUsedByPrices.all().map(r => r.unit_id)
  ]);

  const protectedIds = new Set(directlyInUse);
  for (const id of directlyInUse) {
    const unit = getUnitById.get(id);
    if (unit && unit.base_unit_id) {
      protectedIds.add(unit.base_unit_id);
    }
  }
  return protectedIds;
}

// Deletes every unit NOT in protectedIds, returning the names of the units that were deleted.
// Derived units (base_unit_id set) are deleted before base units, since a base unit can't be
// deleted while any surviving unit -- including one about to be deleted in this same call --
// still references it as its base.
function deleteUnitsExcept(protectedIds) {
  const toDelete = getAllUnits.all().filter(u => !protectedIds.has(u.id));
  const derived = toDelete.filter(u => u.base_unit_id !== null);
  const base = toDelete.filter(u => u.base_unit_id === null);

  for (const u of derived) deleteUnit.run(u.id);
  for (const u of base) deleteUnit.run(u.id);

  return toDelete.map(u => u.name);
}

// Ingredient conversion queries
const getIngredientConversions = db.prepare(`
  SELECT ic.*, u1.name as from_unit_name, u2.name as to_unit_name
  FROM ingredient_conversions ic
  INNER JOIN units u1 ON ic.from_unit_id = u1.id
  INNER JOIN units u2 ON ic.to_unit_id = u2.id
  WHERE ic.ingredient_id = ?
`);

const createIngredientConversion = db.prepare(`
  INSERT INTO ingredient_conversions (ingredient_id, from_unit_id, to_unit_id, factor)
  VALUES (@ingredient_id, @from_unit_id, @to_unit_id, @factor)
`);

const deleteIngredientConversion = db.prepare('DELETE FROM ingredient_conversions WHERE id = ?');

// Cart queries
const getCartRecipeIds = db.prepare('SELECT recipe_id FROM cart');

const addToCart = db.prepare('INSERT OR IGNORE INTO cart (recipe_id) VALUES (?)');

const removeFromCart = db.prepare('DELETE FROM cart WHERE recipe_id = ?');

const getCartRecipes = db.prepare(`
  SELECT r.* FROM recipes r
  INNER JOIN cart c ON r.id = c.recipe_id
  ORDER BY c.added_at DESC
`);

const getShoppingList = db.prepare(`
  SELECT i.id as ingredient_id, i.name, i.preferred_unit_id, ri.quantity, ri.unit_id, u.name as unit, u.category
  FROM ingredients i
  INNER JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
  INNER JOIN units u ON ri.unit_id = u.id
  INNER JOIN cart c ON ri.recipe_id = c.recipe_id
  ORDER BY i.name
`);

// Manual (directly-added, not recipe-derived) shopping list item queries
const getManualListItems = db.prepare(`
  SELECT m.id as manual_item_id, i.id as ingredient_id, i.name, i.preferred_unit_id,
         m.quantity, m.unit_id, u.name as unit, u.category
  FROM manual_list_items m
  INNER JOIN ingredients i ON m.ingredient_id = i.id
  INNER JOIN units u ON m.unit_id = u.id
  ORDER BY i.name
`);

const getManualListItemById = db.prepare('SELECT * FROM manual_list_items WHERE id = ?');

const insertManualListItem = db.prepare(`
  INSERT INTO manual_list_items (ingredient_id, quantity, unit_id)
  VALUES (@ingredient_id, @quantity, @unit_id)
`);

const deleteManualListItem = db.prepare('DELETE FROM manual_list_items WHERE id = ?');

const deleteAllManualListItems = db.prepare('DELETE FROM manual_list_items');

function addManualListItem(data) {
  const result = insertManualListItem.run({
    ingredient_id: data.ingredient_id,
    quantity: data.quantity,
    unit_id: data.unit_id
  });
  return getManualListItemById.get(result.lastInsertRowid);
}

// Store queries
const getAllStores = db.prepare('SELECT * FROM stores ORDER BY name ASC');

const getStoreById = db.prepare('SELECT * FROM stores WHERE id = ?');

const getStoreByName = db.prepare('SELECT * FROM stores WHERE name = ? COLLATE NOCASE');

const createStore = db.prepare('INSERT INTO stores (name) VALUES (@name)');

const updateStore = db.prepare('UPDATE stores SET name = @name WHERE id = @id');

const deleteStore = db.prepare('DELETE FROM stores WHERE id = ?');

// Price queries
const getPriceById = db.prepare('SELECT * FROM prices WHERE id = ?');

const getPricesByIngredientId = db.prepare(`
  SELECT p.*, s.name as store_name, u.name as package_unit_name
  FROM prices p
  INNER JOIN stores s ON p.store_id = s.id
  INNER JOIN units u ON p.package_unit_id = u.id
  WHERE p.ingredient_id = ?
  ORDER BY s.name ASC, p.is_preferred DESC
`);

const getPricesByStoreId = db.prepare(`
  SELECT p.*, i.name as ingredient_name, u.name as package_unit_name
  FROM prices p
  INNER JOIN ingredients i ON p.ingredient_id = i.id
  INNER JOIN units u ON p.package_unit_id = u.id
  WHERE p.store_id = ?
  ORDER BY i.name ASC
`);

const getPreferredPrice = db.prepare(`
  SELECT p.*, u.name as package_unit_name
  FROM prices p
  INNER JOIN units u ON p.package_unit_id = u.id
  WHERE p.ingredient_id = ? AND p.store_id = ? AND p.is_preferred = 1
`);

const getPreferredPricesForIngredient = db.prepare(`
  SELECT p.*, s.name as store_name, u.name as package_unit_name
  FROM prices p
  INNER JOIN stores s ON p.store_id = s.id
  INNER JOIN units u ON p.package_unit_id = u.id
  WHERE p.ingredient_id = ? AND p.is_preferred = 1
`);

const countPricesForPair = db.prepare(
  'SELECT COUNT(*) as c FROM prices WHERE ingredient_id = ? AND store_id = ?'
);

const insertPrice = db.prepare(`
  INSERT INTO prices (ingredient_id, store_id, package_quantity, package_unit_id, price, is_preferred, updated_at)
  VALUES (@ingredient_id, @store_id, @package_quantity, @package_unit_id, @price, @is_preferred, CURRENT_TIMESTAMP)
`);

const updatePriceFields = db.prepare(`
  UPDATE prices
  SET package_quantity = @package_quantity, package_unit_id = @package_unit_id, price = @price, updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const clearPreferredForPair = db.prepare(
  'UPDATE prices SET is_preferred = 0 WHERE ingredient_id = ? AND store_id = ?'
);

const setPreferredFlag = db.prepare('UPDATE prices SET is_preferred = 1 WHERE id = ?');

const deletePrice = db.prepare('DELETE FROM prices WHERE id = ?');

const getMostRecentPriceForPair = db.prepare(
  'SELECT id FROM prices WHERE ingredient_id = ? AND store_id = ? ORDER BY updated_at DESC LIMIT 1'
);

// Settings queries
const getSettingRow = db.prepare('SELECT value FROM app_settings WHERE key = ?');

const upsertSetting = db.prepare(`
  INSERT INTO app_settings (key, value) VALUES (@key, @value)
  ON CONFLICT(key) DO UPDATE SET value = @value
`);

const DEFAULT_STALENESS_DAYS = 182;

// Helper functions
function getRecipeWithIngredients(id) {
  const recipe = getRecipeById.get(id);
  if (!recipe) return null;
  recipe.ingredients = getIngredientsByRecipeId.all(id);
  return recipe;
}

function createRecipeWithIngredients(recipeData) {
  const transaction = db.transaction((data) => {
    const result = createRecipe.run(data);
    const recipeId = result.lastInsertRowid;

    for (const ingredient of data.ingredients) {
      // ingredient should now have ingredient_id, quantity, and unit_id
      createRecipeIngredient.run({
        recipe_id: recipeId,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit_id: ingredient.unit_id
      });
    }

    return recipeId;
  });

  return transaction(recipeData);
}

// Replaces a recipe's core fields and its entire ingredient list in one transaction.
function updateRecipeWithIngredients(id, recipeData) {
  const transaction = db.transaction((data) => {
    updateRecipeFields.run({
      id,
      name: data.name,
      servings: data.servings,
      prep_time: data.prep_time,
      instructions: data.instructions
    });

    deleteRecipeIngredientsByRecipeId.run(id);

    for (const ingredient of data.ingredients) {
      createRecipeIngredient.run({
        recipe_id: id,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit_id: ingredient.unit_id
      });
    }

    return id;
  });

  return transaction(recipeData);
}

// Ingredient helper functions
function getOrCreateIngredient(name) {
  let ingredient = getIngredientByName.get(name);
  if (!ingredient) {
    const result = createIngredient.run({ name });
    ingredient = getIngredientById.get(result.lastInsertRowid);
  }
  return ingredient;
}

// Unit helper functions
function getOrCreateUnit(name, category, base_unit_id, to_base_factor, rounding_increment) {
  let unit = getUnitByName.get(name);
  if (!unit) {
    const result = createUnit.run({
      name,
      category,
      base_unit_id: base_unit_id || null,
      to_base_factor: to_base_factor || null,
      rounding_increment: rounding_increment === undefined ? null : rounding_increment
    });
    unit = getUnitById.get(result.lastInsertRowid);
  }
  return unit;
}

// Converts quantity within the same category via base units. Returns null if not possible.
function tryNaturalConvert(fromUnitId, toUnitId, quantity) {
  const fromUnit = getUnitById.get(fromUnitId);
  const toUnit = getUnitById.get(toUnitId);
  if (!fromUnit || !toUnit || fromUnit.category !== toUnit.category) return null;
  const baseQuantity = fromUnit.base_unit_id ? quantity * fromUnit.to_base_factor : quantity;
  return toUnit.base_unit_id ? baseQuantity / toUnit.to_base_factor : baseQuantity;
}

// Converts quantity from one unit to another, with optional ingredient-specific conversions.
// Supports three conversion strategies (tried in order):
//   1. Direct ingredient conversion (e.g. 1 cup butter = X g)
//   2. Natural conversion within the same category via base units (e.g. tbsp → ml)
//   3. Chained conversion: ingredient-specific cross-category step + natural step (e.g. g butter → ml → tbsp)
function convertUnits(fromUnitId, toUnitId, quantity, ingredientId = null) {
  if (fromUnitId === toUnitId) return quantity;

  const fromUnit = getUnitById.get(fromUnitId);
  const toUnit = getUnitById.get(toUnitId);
  if (!fromUnit || !toUnit) throw new Error('Invalid unit IDs');

  if (ingredientId) {
    const conversions = getIngredientConversions.all(ingredientId);

    // Strategy 1: direct ingredient conversion
    const direct = conversions.find(c => c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId);
    if (direct) return quantity * direct.factor;

    const reverse = conversions.find(c => c.from_unit_id === toUnitId && c.to_unit_id === fromUnitId);
    if (reverse) return quantity / reverse.factor;

    // Strategy 3: chained — use an ingredient conversion to reach the same category as toUnit,
    // then use a natural conversion for the remainder (e.g. g butter → ml → tbsp)
    if (fromUnit.category !== toUnit.category) {
      for (const conv of conversions) {
        let intermediateUnitId, intermediateQuantity;
        if (conv.from_unit_id === fromUnitId) {
          intermediateUnitId = conv.to_unit_id;
          intermediateQuantity = quantity * conv.factor;
        } else if (conv.to_unit_id === fromUnitId) {
          intermediateUnitId = conv.from_unit_id;
          intermediateQuantity = quantity / conv.factor;
        } else {
          continue;
        }
        const result = tryNaturalConvert(intermediateUnitId, toUnitId, intermediateQuantity);
        if (result !== null) return result;
      }
    }
  }

  // Strategy 2: natural conversion within the same category
  if (fromUnit.category !== toUnit.category) {
    throw new Error(`Cannot convert between ${fromUnit.category} and ${toUnit.category} without ingredient-specific conversion`);
  }
  const baseQuantity = fromUnit.base_unit_id ? quantity * fromUnit.to_base_factor : quantity;
  return toUnit.base_unit_id ? baseQuantity / toUnit.to_base_factor : baseQuantity;
}

// Sums quantities across all cart recipes per ingredient, converting into each ingredient's
// preferred unit (or the first unit seen). No display rounding is applied here — this is the
// shared aggregation step used both for the display shopping list and for cart cost math, which
// need to aggregate quantities BEFORE rounding up to whole packages (see getAggregatedCartCost).
function aggregateCartIngredients() {
  const recipeItems = getShoppingList.all().map(item => ({ ...item, is_manual: false, manual_item_id: null }));
  const manualItems = getManualListItems.all().map(item => ({ ...item, is_manual: true }));
  const items = [...recipeItems, ...manualItems];
  const aggregated = {};

  for (const item of items) {
    const key = item.ingredient_id;

    if (!aggregated[key]) {
      aggregated[key] = {
        ingredient_id: item.ingredient_id,
        name: item.name,
        preferred_unit_id: item.preferred_unit_id,
        items: []
      };
    }

    aggregated[key].items.push({
      quantity: item.quantity,
      unit_id: item.unit_id,
      unit_name: item.unit,
      is_manual: item.is_manual,
      manual_item_id: item.manual_item_id
    });
  }

  const result = [];
  for (const key in aggregated) {
    const group = aggregated[key];
    let targetUnitId = group.preferred_unit_id;

    // If no preferred unit, use the first unit encountered
    if (!targetUnitId && group.items.length > 0) {
      targetUnitId = group.items[0].unit_id;
    }

    if (!targetUnitId) continue;

    let totalQuantity = 0;
    const manualEntries = [];
    for (const item of group.items) {
      try {
        const converted = convertUnits(item.unit_id, targetUnitId, item.quantity, group.ingredient_id);
        totalQuantity += converted;
      } catch (error) {
        console.error(`Conversion error for ${group.name}: ${error.message}`);
        if (item.unit_id === targetUnitId) {
          totalQuantity += item.quantity;
        }
      }

      if (item.is_manual) {
        manualEntries.push({ id: item.manual_item_id, quantity: item.quantity, unit_name: item.unit_name });
      }
    }

    result.push({
      ingredient_id: group.ingredient_id,
      name: group.name,
      unit_id: targetUnitId,
      quantity: totalQuantity,
      has_manual: manualEntries.length > 0,
      manual_entries: manualEntries
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function getAggregatedShoppingList() {
  return aggregateCartIngredients().map(group => {
    const targetUnit = getUnitById.get(group.unit_id);
    if (!targetUnit) return null;

    let displayQuantity = group.quantity;
    if (targetUnit.rounding_increment && targetUnit.rounding_increment > 0) {
      displayQuantity = Math.round(group.quantity / targetUnit.rounding_increment) * targetUnit.rounding_increment;
      // Fix floating-point precision (e.g. 0.25 increments)
      const precision = (targetUnit.rounding_increment.toString().split('.')[1] || '').length;
      displayQuantity = parseFloat(displayQuantity.toFixed(precision + 2));
    }

    return {
      ingredient_id: group.ingredient_id,
      name: group.name,
      quantity: displayQuantity,
      unit: targetUnit.name,
      has_manual: group.has_manual,
      manual_entries: group.manual_entries
    };
  }).filter(Boolean);
}

// Store helper functions
function getOrCreateStore(name) {
  let store = getStoreByName.get(name);
  if (!store) {
    const result = createStore.run({ name });
    store = getStoreById.get(result.lastInsertRowid);
  }
  return store;
}

// Price helper functions
// The first price added for an (ingredient, store) pair is auto-preferred, since there's
// otherwise no way to cost that pair at all. Later inserts respect the requested is_preferred
// flag, clearing any sibling first to satisfy the partial unique index.
function createPriceOption(data) {
  const transaction = db.transaction((d) => {
    const existingCount = countPricesForPair.get(d.ingredient_id, d.store_id).c;
    const isPreferred = existingCount === 0 ? true : !!d.is_preferred;

    if (isPreferred) {
      clearPreferredForPair.run(d.ingredient_id, d.store_id);
    }

    const result = insertPrice.run({
      ingredient_id: d.ingredient_id,
      store_id: d.store_id,
      package_quantity: d.package_quantity,
      package_unit_id: d.package_unit_id,
      price: d.price,
      is_preferred: isPreferred ? 1 : 0
    });
    return getPriceById.get(result.lastInsertRowid);
  });
  return transaction(data);
}

function updatePriceOption(id, data) {
  updatePriceFields.run({
    id,
    package_quantity: data.package_quantity,
    package_unit_id: data.package_unit_id,
    price: data.price
  });
  return getPriceById.get(id);
}

function setPreferredPrice(id) {
  const price = getPriceById.get(id);
  if (!price) throw new Error('Price not found');

  const transaction = db.transaction(() => {
    clearPreferredForPair.run(price.ingredient_id, price.store_id);
    setPreferredFlag.run(id);
  });
  transaction();
  return getPriceById.get(id);
}

// If the deleted row was preferred, promotes the most-recently-updated remaining option for
// that (ingredient, store) pair so it doesn't go unpriceable while alternatives still exist.
function deletePriceOption(id) {
  const price = getPriceById.get(id);
  if (!price) return { changes: 0 };

  const transaction = db.transaction(() => {
    const result = deletePrice.run(id);
    if (price.is_preferred) {
      const remaining = getMostRecentPriceForPair.get(price.ingredient_id, price.store_id);
      if (remaining) setPreferredFlag.run(remaining.id);
    }
    return result;
  });
  return transaction();
}

// Settings helper functions
function getSelectedStoreId() {
  const row = getSettingRow.get('selected_store_id');
  return row && row.value !== null ? parseInt(row.value, 10) : null;
}

function setSelectedStoreId(storeId) {
  upsertSetting.run({ key: 'selected_store_id', value: storeId === null || storeId === undefined ? null : String(storeId) });
}

function getPriceStalenessDays() {
  const row = getSettingRow.get('price_staleness_days');
  return row && row.value !== null ? parseFloat(row.value) : DEFAULT_STALENESS_DAYS;
}

function setPriceStalenessDays(days) {
  upsertSetting.run({ key: 'price_staleness_days', value: String(days) });
}

// Cost computation
function isPriceStale(price, thresholdDays) {
  const threshold = thresholdDays === undefined ? getPriceStalenessDays() : thresholdDays;
  const ageMs = Date.now() - new Date(price.updated_at.replace(' ', 'T') + 'Z').getTime();
  return ageMs / 86400000 > threshold;
}

// Finds a cross-store substitute for an ingredient the selected store has no usable price for.
// Considers every OTHER store's preferred price, computes what each would cost for the needed
// quantity, and uses the MEDIAN of those costs (averaging the two middle values when there's an
// even number of candidates) as a deliberately conservative "typical" estimate, rather than
// always picking the cheapest or the most recently updated option. Returns null if no other
// store has a usable price either.
function findSubstitutePrice(item, storeId, thresholdDays) {
  const candidates = getPreferredPricesForIngredient.all(item.ingredient_id)
    .filter(p => p.store_id !== storeId);

  const computed = [];
  for (const candidate of candidates) {
    try {
      const neededInPackageUnit = convertUnits(item.unit_id, candidate.package_unit_id, item.quantity, item.ingredient_id);
      const packagesNeeded = Math.ceil(neededInPackageUnit / candidate.package_quantity);
      computed.push({
        candidate,
        packages_needed: packagesNeeded,
        line_cost: packagesNeeded * candidate.price
      });
    } catch (error) {
      // Unit mismatch at this candidate store too -- not a usable substitute.
    }
  }

  if (computed.length === 0) return null;

  computed.sort((a, b) => a.line_cost - b.line_cost);
  const mid = Math.floor(computed.length / 2);
  const isBlended = computed.length % 2 === 0;
  const contributors = isBlended ? [computed[mid - 1], computed[mid]] : [computed[mid]];
  const medianCost = isBlended
    ? (computed[mid - 1].line_cost + computed[mid].line_cost) / 2
    : computed[mid].line_cost;

  return {
    ingredient_id: item.ingredient_id,
    name: item.name,
    quantity: item.quantity,
    unit_id: item.unit_id,
    line_cost: medianCost,
    is_blended: isBlended,
    source_stores: contributors.map(c => ({
      store_id: c.candidate.store_id,
      store_name: c.candidate.store_name,
      package_quantity: c.candidate.package_quantity,
      package_unit_name: c.candidate.package_unit_name,
      unit_price: c.candidate.price,
      packages_needed: c.packages_needed,
      line_cost: c.line_cost
    })),
    is_stale: contributors.some(c => isPriceStale(c.candidate, thresholdDays))
  };
}

// items: [{ ingredient_id, name, unit_id, unit_name, quantity }]. By default rounds up to whole
// packages (ceil) per ingredient -- that's how purchasing actually works, you can't buy 0.2 of a
// bottle. When roundUp is false, cost is prorated instead: line_cost is the ingredient's exact
// fractional share of the package price (quantity_needed / package_quantity), with no rounding --
// used for single-recipe cost, where a recipe should be charged only its fair share of a package
// that's likely also used elsewhere, not a whole package for 2 tbsp out of a 48-tbsp bottle.
// Ingredients with no preferred price at storeId, or whose unit can't convert to the price's
// package unit, are excluded from total_cost and reported in missing_ingredients — never treated
// as $0. When allowSubstitution is true, a missing ingredient falls back to a cross-store
// substitute (see findSubstitutePrice) before being treated as truly missing; substituted items
// are tracked separately from matched_count but still count toward total_cost.
function computeCostForItems(items, storeId, options = {}) {
  const { allowSubstitution = false, roundUp = true } = options;
  const thresholdDays = getPriceStalenessDays();
  const lineItems = [];
  const substitutedItems = [];
  const missingIngredients = [];
  let totalCost = 0;

  for (const item of items) {
    const priceOption = getPreferredPrice.get(item.ingredient_id, storeId);

    if (priceOption) {
      try {
        const neededInPackageUnit = convertUnits(item.unit_id, priceOption.package_unit_id, item.quantity, item.ingredient_id);

        const lineItem = {
          ingredient_id: item.ingredient_id,
          name: item.name,
          quantity: item.quantity,
          unit_id: item.unit_id,
          unit_name: item.unit_name,
          package_quantity: priceOption.package_quantity,
          package_unit_id: priceOption.package_unit_id,
          package_unit_name: priceOption.package_unit_name,
          unit_price: priceOption.price,
          price_updated_at: priceOption.updated_at,
          is_stale: isPriceStale(priceOption, thresholdDays),
          is_prorated: !roundUp
        };

        if (roundUp) {
          const packagesNeeded = Math.ceil(neededInPackageUnit / priceOption.package_quantity);
          lineItem.packages_needed = packagesNeeded;
          lineItem.line_cost = packagesNeeded * priceOption.price;
        } else {
          const fractionUsed = neededInPackageUnit / priceOption.package_quantity;
          lineItem.fraction_used = fractionUsed;
          lineItem.line_cost = fractionUsed * priceOption.price;
        }

        totalCost += lineItem.line_cost;
        lineItems.push(lineItem);
        continue;
      } catch (error) {
        // Unit mismatch at the selected store -- fall through to substitution/missing below.
      }
    }

    if (allowSubstitution) {
      const substitute = findSubstitutePrice(item, storeId, thresholdDays);
      if (substitute) {
        totalCost += substitute.line_cost;
        substitutedItems.push(substitute);
        continue;
      }
    }

    missingIngredients.push({ ingredient_id: item.ingredient_id, name: item.name });
  }

  return {
    store_id: storeId,
    total_cost: totalCost,
    matched_count: lineItems.length,
    substituted_count: substitutedItems.length,
    total_count: items.length,
    items: lineItems,
    substituted_items: substitutedItems,
    missing_ingredients: missingIngredients
  };
}

// Single-recipe cost: NOT aggregated with the cart/other recipes, no cross-store substitution
// (that's scoped to the shopping list only), and prorated rather than rounded to whole packages --
// see computeCostForItems for why.
function getRecipeCost(recipeId, storeId) {
  const recipe = getRecipeWithIngredients(recipeId);
  if (!recipe) return null;

  const items = recipe.ingredients.map(ing => ({
    ingredient_id: ing.id,
    name: ing.name,
    unit_id: ing.unit_id,
    unit_name: ing.unit,
    quantity: ing.quantity
  }));

  return computeCostForItems(items, storeId, { roundUp: false });
}

// Cart/grocery-list cost: quantities are aggregated across all cart recipes BEFORE rounding up
// to whole packages, so multiple recipes sharing an ingredient don't each buy a full package.
// Missing ingredients get a cross-store substitute price patched in when one is available.
function getAggregatedCartCost(storeId) {
  return computeCostForItems(aggregateCartIngredients(), storeId, { allowSubstitution: true });
}

function getAllRecipesWithIngredients() {
  const recipes = getAllRecipes.all();
  return recipes.map(recipe => {
    const ingredients = getIngredientsByRecipeId.all(recipe.id);
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
}

function deleteAllRecipes() {
  db.prepare('DELETE FROM recipes').run();
}

module.exports = {
  db,
  getAllRecipes,
  getRecipeById,
  getRecipeWithIngredients,
  createRecipeWithIngredients,
  updateRecipeWithIngredients,
  deleteRecipe,
  getCartRecipeIds,
  getCartRecipes,
  addToCart,
  removeFromCart,
  getAggregatedShoppingList,
  getAllRecipesWithIngredients,
  deleteAllRecipes,
  // Manual list item exports
  getManualListItems,
  getManualListItemById,
  addManualListItem,
  deleteManualListItem,
  deleteAllManualListItems,
  // Ingredient exports
  getAllIngredients,
  getIngredientById,
  getIngredientByName,
  getOrCreateIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  updateIngredientPreferredUnit,
  // Unit exports
  getAllUnits,
  getUnitById,
  getUnitByName,
  getUnitsByCategory,
  getBaseUnits,
  getOrCreateUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  getInUseUnitIds,
  deleteUnitsExcept,
  convertUnits,
  // Ingredient conversion exports
  getIngredientConversions,
  createIngredientConversion,
  deleteIngredientConversion,
  // Store exports
  getAllStores,
  getStoreById,
  getStoreByName,
  getOrCreateStore,
  createStore,
  updateStore,
  deleteStore,
  // Price exports
  getPriceById,
  getPricesByIngredientId,
  getPricesByStoreId,
  getPreferredPrice,
  createPriceOption,
  updatePriceOption,
  setPreferredPrice,
  deletePriceOption,
  // Settings exports
  getSelectedStoreId,
  setSelectedStoreId,
  getPriceStalenessDays,
  setPriceStalenessDays,
  // Cost exports
  isPriceStale,
  getRecipeCost,
  getAggregatedCartCost
};
