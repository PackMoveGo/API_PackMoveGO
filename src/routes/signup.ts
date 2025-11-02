import express from 'express';
const { check } = require('express-validator');
import { signup } from '../controllers/userController';

const router = express.Router();

// Validation middleware
const validateUser = [
  check('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),
  check('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters long'),
  check('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  check('phone').trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 digits long')
];

// Routes
router.post('/signup', validateUser, signup);

export default router; 