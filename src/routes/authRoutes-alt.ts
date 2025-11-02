import {Router} from 'express';
import {signUp,signIn,signOut} from '../controllers/authController';

const authRouter=Router();

// Path: /v1/auth/sign-up (POST)
authRouter.post('/sign-up',signUp);
// Path: /v1/auth/sign-in (POST)
authRouter.post('/sign-in',signIn);
// Path: /v1/auth/sign-out (POST)
authRouter.post('/sign-out',signOut);

export default authRouter;

