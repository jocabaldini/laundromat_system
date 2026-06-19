import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3001),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().trim().optional().invalid('*').messages({
    'any.invalid': 'CORS_ORIGIN="*" is not allowed',
  }),
  API_LOCALE: Joi.string().valid('pt', 'en').default('pt'), // ← new
});
