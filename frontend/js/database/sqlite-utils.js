export function sqliteErrorMessage(result) {
  if (typeof result?.message === 'string' && result.message.trim()) {
    return result.message;
  }

  if (typeof result?.error === 'string' && result.error.trim()) {
    return result.error;
  }

  return null;
}

export function assertSqliteSucceeded(result, operation) {
  const changes = result?.changes?.changes;
  const message = sqliteErrorMessage(result);

  if (message || changes === -1 || !Number.isFinite(changes)) {
    throw new Error(message || `O SQLite não conseguiu ${operation}.`);
  }

  return result.changes;
}
