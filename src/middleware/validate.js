const logger = require('../utils/logger');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      const details = error.details.map((d) => d.message);
      logger.warn('Validation failed', { path: req.path, errors: details });
      return res.status(400).json({ success: false, errors: details });
    }

    req.body = value;
    next();
  };
}

module.exports = validate;
