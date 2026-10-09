import { MESSAGES } from '../constants/messages.js';

// Customer copy is deliberately separate from backend diagnostic messages.
export function getErrorMessage(error, action = 'general') {
  if (error.status === 401) return action === 'login' ? MESSAGES.invalidCredentials : MESSAGES.sessionExpired;
  if (error.status === 403) return MESSAGES.forbidden;
  if (error.status === 429) return MESSAGES.rateLimited;
  if (error.status === 409 && action === 'register') return MESSAGES.usernameTaken;
  if (error.status === 404 && ['save', 'delete'].includes(action)) return MESSAGES.productMissing;
  if (error.status === 400 && action === 'register') {
    return error.message === 'Password must be at least 6 characters' ? MESSAGES.passwordShort : MESSAGES.registerFields;
  }
  if (error.status === 400 && action === 'login') return MESSAGES.authFields;

  // A lost response (or a server error after a write) does not prove a write failed.
  const uncertain = ['NETWORK_ERROR', 'TIMEOUT', 'INVALID_RESPONSE'].includes(error.code) || error.status >= 500;
  if (uncertain) {
    if (action === 'save') return MESSAGES.saveUnconfirmed;
    if (action === 'delete') return MESSAGES.deleteUnconfirmed;
    if (action === 'register') return MESSAGES.registerUnconfirmed;
  }
  const byAction = {
    load: MESSAGES.loadFailed, session: MESSAGES.sessionFailed,
    login: MESSAGES.signInFailed, register: MESSAGES.registerFailed,
    logout: MESSAGES.signOutFailed, save: MESSAGES.saveFailed, delete: MESSAGES.deleteFailed,
  };
  return byAction[action] || (error.code === 'NETWORK_ERROR' ? MESSAGES.connection : error.code === 'TIMEOUT' ? MESSAGES.timeout : MESSAGES.unavailable);
}
