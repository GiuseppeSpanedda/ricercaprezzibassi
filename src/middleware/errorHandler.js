export function errorHandler(error, _req, res, _next) {
  const status = Number(error.status || error.statusCode || 500);

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || 'Errore interno del server.'
  });
}
