// Valida req.body con un esquema de Zod antes de llegar al controlador.
// Si los datos están mal, responde 400 con el detalle de cada campo.
module.exports = (esquema) => (req, res, next) => {
  const r = esquema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ mensaje: 'Datos inválidos', errores: r.error.flatten().fieldErrors });
  req.body = r.data;
  next();
};
