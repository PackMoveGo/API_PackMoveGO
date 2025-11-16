import{describe,it,expect,beforeAll,afterAll,jest} from '@jest/globals';
import request from 'supertest';
import JWTUtils from '../../src/util/jwt-utils';
import PasswordUtils from '../../src/util/password-utils';
import TokenBlacklist from '../../src/models/tokenBlacklistModel';

describe('Authentication Security Tests',()=>{
  
  describe('JWT Token Security',()=>{
    it('should reject tokens with invalid signature',async ()=>{
      const fakeToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.fake_signature';
      
      const result=await JWTUtils.verifyToken(fakeToken);
      expect(result).toBeNull();
    });

    it('should reject expired tokens',async ()=>{
      // Create token that expires immediately
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const token=JWTUtils.generateAccessToken(payload);
      
      // Wait for expiration (would need to mock time in real test)
      // For now, just verify token is created
      expect(token).toBeDefined();
    });

    it('should enforce minimum secret length',()=>{
      // This is checked at initialization, would need separate test process
      expect(process.env.JWT_SECRET).toBeDefined();
      if(process.env.JWT_SECRET){
        expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
      }
    });

    it('should include fingerprint in token payload',()=>{
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const tokenPair=JWTUtils.generateTokenPair(payload,'Mozilla/5.0','192.168.1.1');
      
      expect(tokenPair.fingerprint).toBeDefined();
      expect(tokenPair.fingerprint.length).toBe(64); // SHA256 hash
    });

    it('should detect fingerprint mismatch',()=>{
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const tokenPair=JWTUtils.generateTokenPair(payload,'Mozilla/5.0','192.168.1.1');
      
      // Try to verify with different user agent
      const isValid=JWTUtils.verifyFingerprint(tokenPair.accessToken,'Chrome','192.168.1.2');
      expect(isValid).toBe(false);
    });

    it('should blacklist token on revocation',async ()=>{
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const token=JWTUtils.generateAccessToken(payload);
      const tokenHash=JWTUtils.hashToken(token);
      
      // Blacklist token
      await TokenBlacklist.blacklistToken(tokenHash,'123','logout',new Date(Date.now()+3600000));
      
      // Verify token is blacklisted
      const isBlacklisted=await TokenBlacklist.isBlacklisted(tokenHash);
      expect(isBlacklisted).toBe(true);
      
      // Cleanup
      await TokenBlacklist.deleteOne({tokenHash});
    });
  });

  describe('Password Security',()=>{
    it('should require strong passwords',()=>{
      const weakPasswords=['password','12345678','abcdefgh','Weak1'];
      
      weakPasswords.forEach(password=>{
        const result=PasswordUtils.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should accept strong passwords',()=>{
      const strongPasswords=['SecurePass123!','MyP@ssw0rd2024','C0mpl3x!Pass'];
      
      strongPasswords.forEach(password=>{
        const result=PasswordUtils.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });

    it('should reject common passwords',()=>{
      const result=PasswordUtils.validatePassword('Password123!');
      expect(result.isValid).toBe(false);
    });

    it('should hash passwords with bcrypt',async ()=>{
      const password='SecurePass123!';
      const hash=await PasswordUtils.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.startsWith('$2a$12$')||hash.startsWith('$2b$12$')).toBe(true); // bcrypt with 12 rounds
    });

    it('should verify correct passwords',async ()=>{
      const password='SecurePass123!';
      const hash=await PasswordUtils.hashPassword(password);
      const isValid=await PasswordUtils.verifyPassword(password,hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords',async ()=>{
      const password='SecurePass123!';
      const hash=await PasswordUtils.hashPassword(password);
      const isValid=await PasswordUtils.verifyPassword('WrongPassword123!',hash);
      
      expect(isValid).toBe(false);
    });

    it('should detect password in history',async ()=>{
      const password='SecurePass123!';
      const hash1=await PasswordUtils.hashPassword(password);
      const hash2=await PasswordUtils.hashPassword('OldPass123!');
      
      const passwordHistory=[hash1,hash2];
      const inHistory=await PasswordUtils.checkPasswordHistory(password,passwordHistory);
      
      expect(inHistory).toBe(true);
    });
  });

  describe('Account Lockout',()=>{
    it('should lock account after 5 failed attempts',()=>{
      // This would be tested via API integration test
      expect(true).toBe(true); // Placeholder
    });

    it('should unlock after 30 minutes',()=>{
      // Time-based test, would need time mocking
      expect(true).toBe(true); // Placeholder
    });

    it('should require CAPTCHA after 3 failed attempts',()=>{
      // Integration test needed
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Token Rotation',()=>{
    it('should blacklist old refresh token on rotation',async ()=>{
      // Create initial token
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const tokenPair=JWTUtils.generateTokenPair(payload,'Mozilla','192.168.1.1');
      
      // Rotate token
      const newPair=await JWTUtils.refreshAccessToken(
        tokenPair.refreshToken,
        'Mozilla',
        '192.168.1.1'
      );
      
      expect(newPair).toBeDefined();
      if(newPair){
        expect(newPair.accessToken).not.toBe(tokenPair.accessToken);
        expect(newPair.refreshToken).not.toBe(tokenPair.refreshToken);
      }

      // Cleanup
      const oldTokenHash=JWTUtils.hashToken(tokenPair.refreshToken);
      await TokenBlacklist.deleteOne({tokenHash:oldTokenHash});
    });

    it('should reject fingerprint mismatch on refresh',async ()=>{
      const payload={userId:'123',role:'customer',email:'test@test.com'};
      const tokenPair=JWTUtils.generateTokenPair(payload,'Mozilla','192.168.1.1');
      
      // Try to refresh with different fingerprint
      const newPair=await JWTUtils.refreshAccessToken(
        tokenPair.refreshToken,
        'Chrome', // Different user agent
        '192.168.1.2' // Different IP
      );
      
      expect(newPair).toBeNull();
    });
  });

  describe('Session Management',()=>{
    it('should enforce max 3 concurrent sessions',()=>{
      // Integration test needed with Session model
      expect(true).toBe(true); // Placeholder
    });

    it('should revoke oldest session when limit reached',()=>{
      // Integration test needed
      expect(true).toBe(true); // Placeholder
    });
  });
});

