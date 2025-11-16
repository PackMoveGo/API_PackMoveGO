/**
 * Verification Session Management
 * Manages temporary verification states that get nulled when user navigates away
 */

import crypto from 'crypto';

interface VerificationSession{
  sessionId:string;
  phone:string;
  code:string;
  codeExpiry:Date;
  createdAt:Date;
  lastAccess:Date;
  isActive:boolean;
}

/**
 * In-memory verification sessions (temporary, cleared on navigation)
 */
class VerificationSessionManager{
  private sessions:Map<string,VerificationSession>=new Map();
  private readonly SESSION_TIMEOUT=10*60*1000; // 10 minutes
  private readonly INACTIVITY_TIMEOUT=2*60*1000; // 2 minutes of inactivity

  constructor(){
    // Cleanup expired sessions every minute
    setInterval(()=>this.cleanupExpiredSessions(),60*1000);
  }

  /**
   * Create verification session
   */
  createSession(phone:string,code:string):string{
    const sessionId=crypto.randomBytes(16).toString('hex');
    
    const session:VerificationSession={
      sessionId,
      phone,
      code,
      codeExpiry:new Date(Date.now()+this.SESSION_TIMEOUT),
      createdAt:new Date(),
      lastAccess:new Date(),
      isActive:true
    };

    this.sessions.set(sessionId,session);

    console.log(`✅ [VERIFY-SESSION] Created session ${sessionId} for ${phone}`);
    
    return sessionId;
  }

  /**
   * Get verification session
   */
  getSession(sessionId:string):VerificationSession|null{
    const session=this.sessions.get(sessionId);

    if(!session){
      console.log(`❌ [VERIFY-SESSION] Session ${sessionId} not found`);
      return null;
    }

    // Check if expired
    if(new Date()>session.codeExpiry){
      console.log(`❌ [VERIFY-SESSION] Session ${sessionId} expired`);
      this.deleteSession(sessionId);
      return null;
    }

    // Check inactivity
    if(new Date().getTime()-session.lastAccess.getTime()>this.INACTIVITY_TIMEOUT){
      console.log(`❌ [VERIFY-SESSION] Session ${sessionId} inactive, nulling`);
      this.deleteSession(sessionId);
      return null;
    }

    // Update last access
    session.lastAccess=new Date();

    return session;
  }

  /**
   * Update session activity (call on any interaction)
   */
  updateActivity(sessionId:string):boolean{
    const session=this.sessions.get(sessionId);
    
    if(!session){
      return false;
    }

    session.lastAccess=new Date();
    console.log(`🔄 [VERIFY-SESSION] Activity updated for ${sessionId}`);
    
    return true;
  }

  /**
   * Verify code with session
   */
  verifyCode(sessionId:string,code:string):{valid:boolean,phone?:string}{
    const session=this.getSession(sessionId);

    if(!session){
      return{valid:false};
    }

    if(session.code===code){
      console.log(`✅ [VERIFY-SESSION] Code verified for ${sessionId}`);
      return{valid:true,phone:session.phone};
    }

    console.log(`❌ [VERIFY-SESSION] Invalid code for ${sessionId}`);
    return{valid:false};
  }

  /**
   * Delete session (called on navigation away or successful verification)
   */
  deleteSession(sessionId:string):void{
    if(this.sessions.has(sessionId)){
      console.log(`🗑️ [VERIFY-SESSION] Deleted session ${sessionId}`);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions():void{
    const now=new Date();
    let cleaned=0;

    for(const[sessionId,session] of this.sessions.entries()){
      if(now>session.codeExpiry){
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if(cleaned>0){
      console.log(`🧹 [VERIFY-SESSION] Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions():number{
    return this.sessions.size;
  }
}

// Export singleton instance
export const verificationSessionManager=new VerificationSessionManager();

export default verificationSessionManager;

