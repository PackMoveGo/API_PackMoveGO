import{Router} from 'express';
import{
  signUp,
  signIn,
  signOut,
  requestSmsSignin,
  verifySmsCode,
  refreshToken,
  getAuthStatus
} from '../controllers/authController';
import{authenticateToken} from '../middlewares/authMiddleware';
import verificationSessionManager from '../util/verification-session';

const router=Router();

// Public routes
router.post('/signup',signUp);
// /signin route handles both email/password and SMS signin based on request body
router.post('/signin',(req,res,next)=>{
  // If request has phone number, treat as SMS signin request
  if(req.body.phone){
    return requestSmsSignin(req,res,next);
  }
  // Otherwise, treat as email/password signin
  return signIn(req,res,next);
});
router.post('/request-sms',requestSmsSignin); // Explicit SMS signin endpoint
router.post('/verify',verifySmsCode);
router.post('/refresh',refreshToken);

// Protected routes
router.post('/logout',authenticateToken,signOut);
router.get('/status',getAuthStatus);
router.get('/me',authenticateToken,getAuthStatus);

// Verification session activity ping (keeps session alive)
router.post('/verify-ping',(req,res)=>{
  try{
    const{verificationSessionId}=req.body;

    if(!verificationSessionId){
      return res.status(400).json({
        success:false,
        message:'Verification session ID required'
      });
    }

    const isActive=verificationSessionManager.updateActivity(verificationSessionId);

    if(!isActive){
      return res.status(410).json({
        success:false,
        message:'Verification session expired or invalid',
        code:'VERIFICATION_SESSION_EXPIRED',
        redirectTo:'/signin'
      });
    }

    return res.json({
      success:true,
      message:'Session activity updated'
    });
  }catch(error){
    return res.status(500).json({
      success:false,
      message:'Failed to update session activity'
    });
  }
});

// Check verification session status
router.get('/verify-status/:sessionId',(req,res)=>{
  try{
    const{sessionId}=req.params;
    const session=verificationSessionManager.getSession(sessionId);

    if(!session){
      return res.status(410).json({
        success:false,
        message:'Verification session expired or invalid',
        code:'VERIFICATION_SESSION_EXPIRED',
        redirectTo:'/signin'
      });
    }

    return res.json({
      success:true,
      data:{
        phone:session.phone,
        expiresAt:session.codeExpiry,
        isActive:session.isActive
      }
    });
  }catch(error){
    return res.status(500).json({
      success:false,
      message:'Failed to check session status'
    });
  }
});

export default router;
