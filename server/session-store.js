const session = require('express-session');
const db = require('./db');

class DatabaseSessionStore extends session.Store {
  get(id, callback) {
    db.sessionGet(id)
      .then(value => callback(null, value || null))
      .catch(callback);
  }

  set(id, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires
      ? new Date(value.cookie.expires).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.sessionSet(id, JSON.parse(JSON.stringify(value)), expiresAt)
      .then(() => callback())
      .catch(callback);
  }

  destroy(id, callback = () => {}) {
    db.sessionDestroy(id)
      .then(() => callback())
      .catch(callback);
  }

  touch(id, value, callback = () => {}) {
    this.set(id, value, callback);
  }
}

module.exports = DatabaseSessionStore;