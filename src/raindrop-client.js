/**
 * Raindrop.io API Client
 * Documentation: https://developer.raindrop.io/
 */

export class RaindropClient {
  constructor(token) {
    if (!token) {
      throw new Error('Raindrop.io API token is required');
    }
    this.token = token;
    this.baseUrl = 'https://api.raindrop.io/rest/v1';
  }

  /**
   * Make an authenticated request to the Raindrop.io API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Raindrop API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // ========== Raindrops (Bookmarks) Methods ==========

  /**
   * Get a single raindrop by ID
   */
  async getRaindrop(id) {
    return this.request(`/raindrop/${id}`);
  }

  /**
   * Get multiple raindrops from a collection
   * @param {number|string} collectionId - Collection ID (0=all, -1=unsorted, -99=trash)
   * @param {Object} params - Query parameters (page, perpage, search, sort, nested)
   */
  async getRaindrops(collectionId = 0, params = {}) {
    const query = new URLSearchParams();

    if (params.page !== undefined) query.append('page', params.page);
    if (params.perpage !== undefined) query.append('perpage', params.perpage);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.nested !== undefined) query.append('nested', params.nested);

    const queryString = query.toString();
    const endpoint = `/raindrops/${collectionId}${queryString ? '?' + queryString : ''}`;

    return this.request(endpoint);
  }

  /**
   * Create a new raindrop (bookmark)
   * @param {Object} data - Raindrop data (link required, plus title, tags, collection, etc.)
   */
  async createRaindrop(data) {
    return this.request('/raindrop', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Update an existing raindrop
   */
  async updateRaindrop(id, data) {
    return this.request(`/raindrop/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Delete a raindrop (moves to trash, or permanently deletes if already in trash)
   */
  async deleteRaindrop(id) {
    return this.request(`/raindrop/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Search raindrops across all collections
   */
  async searchRaindrops(searchQuery, params = {}) {
    return this.getRaindrops(0, { ...params, search: searchQuery });
  }

  // ========== Collections Methods ==========

  /**
   * Get all root collections
   */
  async getCollections() {
    return this.request('/collections');
  }

  /**
   * Get child collections
   */
  async getChildCollections() {
    return this.request('/collections/childrens');
  }

  /**
   * Get a specific collection by ID
   */
  async getCollection(id) {
    return this.request(`/collection/${id}`);
  }

  /**
   * Create a new collection
   * @param {Object} data - Collection data (title, view, sort, public, parent, etc.)
   */
  async createCollection(data) {
    return this.request('/collection', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Update an existing collection
   */
  async updateCollection(id, data) {
    return this.request(`/collection/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id) {
    return this.request(`/collection/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Delete multiple collections
   */
  async deleteCollections(ids) {
    return this.request('/collections', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  }

  // ========== Tags Methods ==========

  /**
   * Get all tags, optionally filtered by collection
   */
  async getTags(collectionId = null) {
    const endpoint = collectionId !== null
      ? `/tags/${collectionId}`
      : '/tags/0';
    return this.request(endpoint);
  }

  /**
   * Rename a tag
   * @param {string} oldTag - Current tag name
   * @param {string} newTag - New tag name
   * @param {number} collectionId - Optional collection ID to limit scope
   */
  async renameTag(oldTag, newTag, collectionId = null) {
    const endpoint = collectionId !== null
      ? `/tags/${collectionId}`
      : '/tags';

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        replace: newTag,
        tags: [oldTag]
      })
    });
  }

  /**
   * Merge multiple tags into one
   * @param {Array<string>} oldTags - Tags to merge
   * @param {string} newTag - Target tag name
   * @param {number} collectionId - Optional collection ID to limit scope
   */
  async mergeTags(oldTags, newTag, collectionId = null) {
    const endpoint = collectionId !== null
      ? `/tags/${collectionId}`
      : '/tags';

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        replace: newTag,
        tags: oldTags
      })
    });
  }

  /**
   * Delete one or more tags
   * @param {Array<string>} tags - Tags to delete
   * @param {number} collectionId - Optional collection ID to limit scope
   */
  async deleteTags(tags, collectionId = null) {
    const endpoint = collectionId !== null
      ? `/tags/${collectionId}`
      : '/tags';

    return this.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ tags })
    });
  }

  // ========== User Methods ==========

  /**
   * Get current user information
   */
  async getCurrentUser() {
    return this.request('/user');
  }
}
