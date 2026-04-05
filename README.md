# Recipe Shopper

A simple web application for managing recipes and generating shopping lists. Add your favorite recipes with ingredients, add them to your cart, and automatically generate an aggregated shopping list.

## Features

- **Recipe Management**: Create, view, and delete recipes with ingredients, servings, prep time, and instructions
- **Shopping Cart**: Add recipes to a cart for meal planning
- **Smart Shopping List**: Automatically aggregates ingredients across all recipes in your cart, combining quantities of the same ingredient
- **Persistent Storage**: SQLite database ensures your data is saved
- **Docker Deployment**: Easy deployment with Docker and Docker Compose
- **Single-user app**: Designed for personal use

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Deployment**: Docker

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system

### Installation & Running

1. Clone or download this repository

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3000`

### Stopping the Application

```bash
docker-compose down
```

To remove the data volume as well:
```bash
docker-compose down -v
```

## Deploying Behind Tailscale

Since this is a single-user application without authentication, it's recommended to deploy it behind Tailscale for secure remote access.

### Option 1: Run Docker Container on Tailscale Network

1. Install Tailscale on your host machine:
   - Follow instructions at https://tailscale.com/download

2. Start the Recipe Shopper container as normal:
```bash
docker-compose up -d
```

3. Access the application via your machine's Tailscale IP:
   - Find your Tailscale IP: `tailscale ip -4`
   - Access at: `http://<tailscale-ip>:3000`

### Option 2: Run Container with Tailscale Sidecar

For more advanced setups, you can run Tailscale directly in the container:

1. Modify `docker-compose.yml` to add Tailscale configuration
2. Use Tailscale's Docker guide: https://tailscale.com/kb/1282/docker

### Option 3: Tailscale Funnel (Public HTTPS)

If you want to access your app from any device without installing Tailscale:

1. Enable Tailscale Funnel on your host machine
2. This provides a public HTTPS URL while keeping the app secure

Refer to Tailscale's documentation for detailed setup: https://tailscale.com/kb/1223/tailscale-funnel

## Usage

### Adding a Recipe

1. Click "Add Recipe" in the navigation
2. Enter recipe name (required)
3. Add servings and prep time (optional)
4. Add ingredients with quantity and unit
5. Add cooking instructions (optional)
6. Click "Save Recipe"

### Creating a Shopping List

1. Browse your recipes in the "Recipes" view
2. Click "Add to Cart" for recipes you want to cook
3. View your cart in the "Cart" view
4. Click "Shopping List" to see the aggregated ingredient list
5. Check off items as you shop

### Ingredient Aggregation

The app automatically combines ingredients with the same name and unit across multiple recipes. For example:
- Recipe 1: 2 cups flour
- Recipe 2: 1 cup flour
- Shopping List: 3 cups flour

**Future Enhancement**: The app will support "ceiling" quantities to account for package sizes (e.g., if you need 18 oz but items come in 14 oz packages, it will suggest buying 2 packages).

## Data Persistence

Recipe data is stored in a SQLite database located in a Docker volume. This ensures your recipes persist even if the container is restarted or recreated.

To backup your data:
```bash
docker cp recipe-shopper:/app/data/recipes.db ./backup.db
```

To restore from backup:
```bash
docker cp ./backup.db recipe-shopper:/app/data/recipes.db
docker-compose restart
```

## Development

To run locally without Docker:

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-reload (Node 18+):
```bash
npm run dev
```

## Project Structure

```
recipe-shopper/
├── server.js           # Express server and API routes
├── db.js              # SQLite database setup and queries
├── package.json       # Node.js dependencies
├── Dockerfile         # Docker image definition
├── docker-compose.yml # Docker Compose configuration
├── public/            # Frontend files
│   ├── index.html     # Main HTML structure
│   ├── app.js         # Frontend JavaScript logic
│   └── styles.css     # CSS styling
└── data/              # SQLite database (created at runtime)
    └── recipes.db
```

## Future Enhancements

- Package size ceiling for shopping list quantities
- Recipe categories and tagging
- Search and filter functionality
- Import/export recipes
- Meal planning calendar
- Nutritional information
- Recipe scaling based on servings

## License

None.
