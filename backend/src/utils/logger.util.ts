import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), simple()),
    }),
  ],
});

export default logger;
