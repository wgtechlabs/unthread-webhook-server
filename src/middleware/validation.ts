import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

const validationRules: ValidationChain[] = [
    body('event')
        .exists().withMessage('Event type is required')
        .isString().withMessage('Event type must be a string'),
    body('eventId')
        .exists().withMessage('Event ID is required')
        .isString().withMessage('Event ID must be a string'),
    body('eventTimestamp')
        .exists().withMessage('Event timestamp is required')
        .isNumeric().withMessage('Event timestamp must be a number'),
    body('webhookTimestamp')
        .exists().withMessage('Webhook timestamp is required')
        .isNumeric().withMessage('Webhook timestamp must be a number')
];

const handleValidationErrors = (req: Request, res: Response<ErrorResponse>, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array(),
            timestamp: new Date().toISOString()
        });
        return;
    }
    next();
};

export const validateEvent = [...validationRules, handleValidationErrors];