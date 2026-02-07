import { createClient } from '@libsql/client';

const client = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
});

export const db = {
  // Get all items
  async getAllItems() {
    const result = await client.execute(
      'SELECT * FROM items ORDER BY updated_at DESC'
    );
    return result.rows;
  },

  // Get item by ID
  async getItem(id) {
    const result = await client.execute({
      sql: 'SELECT * FROM items WHERE id = ?',
      args: [id]
    });
    return result.rows[0];
  },

  // Get items in a location
  async getItemsInLocation(locationId) {
    const result = await client.execute({
      sql: 'SELECT * FROM items WHERE current_location_id = ?',
      args: [locationId]
    });
    return result.rows;
  },

  // Add new item
  async addItem(id, description, type, quantity, locationId) {
    await client.execute({
      sql: `INSERT INTO items (id, description, type, quantity, current_location_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, description, type, quantity, locationId]
    });

    // Log the movement
    await this.logMovement(id, null, locationId, quantity, 'ADD', `Added ${description}`);
  },

  // Move item
  async moveItem(itemId, fromLocationId, toLocationId, quantity = null) {
    await client.execute({
      sql: 'UPDATE items SET current_location_id = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
      args: [toLocationId, itemId]
    });

    await this.logMovement(itemId, fromLocationId, toLocationId, quantity, 'MOVE', null);
  },

  // Update item quantity
  async updateQuantity(itemId, newQuantity) {
    await client.execute({
      sql: 'UPDATE items SET quantity = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
      args: [newQuantity, itemId]
    });
  },

  // Remove item
  async removeItem(itemId, locationId) {
    await client.execute({
      sql: 'DELETE FROM items WHERE id = ?',
      args: [itemId]
    });

    await this.logMovement(itemId, locationId, 'TRASH', null, 'REMOVE', null);
  },

  // Log movement
  async logMovement(itemId, fromLocationId, toLocationId, quantity, action, transcript) {
    await client.execute({
      sql: `INSERT INTO movements (item_id, from_location_id, to_location_id, quantity, action, transcript)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [itemId, fromLocationId, toLocationId, quantity, action, transcript]
    });
  },

  // Get recent movements
  async getRecentMovements(limit = 10) {
    const result = await client.execute({
      sql: `SELECT m.*, i.description as item_description
            FROM movements m
            LEFT JOIN items i ON m.item_id = i.id
            ORDER BY m.timestamp DESC
            LIMIT ?`,
      args: [limit]
    });
    return result.rows;
  },

  // Get last movement (for undo)
  async getLastMovement() {
    const result = await client.execute(
      'SELECT * FROM movements ORDER BY timestamp DESC LIMIT 1'
    );
    return result.rows[0];
  },

  // Search items
  async searchItems(query) {
    const result = await client.execute({
      sql: `SELECT i.*, l.description as location_description
            FROM items i
            LEFT JOIN locations l ON i.current_location_id = l.id
            WHERE i.description LIKE ? OR i.id LIKE ?
            ORDER BY i.updated_at DESC`,
      args: [`%${query}%`, `%${query}%`]
    });
    return result.rows;
  },

  // Get location info
  async getLocation(id) {
    const result = await client.execute({
      sql: 'SELECT * FROM locations WHERE id = ?',
      args: [id]
    });
    return result.rows[0];
  },

  // Ensure location exists (create if not)
  async ensureLocation(locationId, description = null) {
    // Check if location exists
    const existing = await this.getLocation(locationId);
    if (existing) {
      return existing;
    }

    // Determine location type from ID
    let type = 'general';
    if (locationId.startsWith('BIN-')) type = 'bin';
    else if (locationId.startsWith('SHELF-')) type = 'shelf';
    else if (locationId.startsWith('WORKBENCH-')) type = 'workbench';
    else if (locationId.startsWith('CABINET-')) type = 'cabinet';
    else if (locationId === 'TRASH') type = 'trash';

    // Create location if it doesn't exist
    console.log(`Creating location: ${locationId} (type: ${type})`);
    await client.execute({
      sql: 'INSERT INTO locations (id, description, type) VALUES (?, ?, ?)',
      args: [locationId, description || locationId, type]
    });

    return await this.getLocation(locationId);
  },

  // Get all locations
  async getAllLocations() {
    const result = await client.execute('SELECT * FROM locations ORDER BY id');
    return result.rows;
  }
};

export default db;
