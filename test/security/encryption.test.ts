import{describe,it,expect,beforeAll} from '@jest/globals';
import EncryptionUtils from '../../src/util/encryption';

describe('Encryption Security Tests',()=>{
  
  beforeAll(()=>{
    // Set encryption key for testing
    if(!process.env.ENCRYPTION_MASTER_KEY){
      process.env.ENCRYPTION_MASTER_KEY=EncryptionUtils.generateMasterKey();
    }
  });

  describe('Field Encryption',()=>{
    it('should encrypt and decrypt data',()=>{
      const plaintext='Sensitive information';
      
      const encrypted=EncryptionUtils.encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      
      if(encrypted){
        const decrypted=EncryptionUtils.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should produce different ciphertexts for same plaintext',()=>{
      const plaintext='Sensitive information';
      
      const encrypted1=EncryptionUtils.encrypt(plaintext);
      const encrypted2=EncryptionUtils.encrypt(plaintext);
      
      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both decrypt to same plaintext
      if(encrypted1 && encrypted2){
        expect(EncryptionUtils.decrypt(encrypted1)).toBe(plaintext);
        expect(EncryptionUtils.decrypt(encrypted2)).toBe(plaintext);
      }
    });

    it('should reject tampered ciphertext',()=>{
      const plaintext='Sensitive information';
      const encrypted=EncryptionUtils.encrypt(plaintext);
      
      if(encrypted){
        // Tamper with encrypted data
        const tampered=encrypted.replace(/.$/, 'x');
        const decrypted=EncryptionUtils.decrypt(tampered);
        
        expect(decrypted).toBeNull(); // Should fail auth tag check
      }
    });

    it('should handle null/undefined gracefully',()=>{
      expect(EncryptionUtils.encrypt(null as any)).toBe(null);
      expect(EncryptionUtils.decrypt(null as any)).toBe(null);
    });
  });

  describe('Object Field Encryption',()=>{
    it('should encrypt specific fields only',()=>{
      const obj={
        publicData:'Not encrypted',
        secretData:'Should be encrypted',
        moreSecrets:'Also encrypted'
      };
      
      const encrypted=EncryptionUtils.encryptFields(obj,['secretData','moreSecrets']);
      
      expect(encrypted.publicData).toBe('Not encrypted');
      expect(encrypted.secretData).not.toBe('Should be encrypted');
      expect(encrypted.moreSecrets).not.toBe('Also encrypted');
    });

    it('should decrypt specific fields only',()=>{
      const obj={
        publicData:'Not encrypted',
        secretData:'Sensitive'
      };
      
      const encrypted=EncryptionUtils.encryptFields(obj,['secretData']);
      const decrypted=EncryptionUtils.decryptFields(encrypted,['secretData']);
      
      expect(decrypted.publicData).toBe('Not encrypted');
      expect(decrypted.secretData).toBe('Sensitive');
    });
  });

  describe('Hashing',()=>{
    it('should hash data consistently',()=>{
      const data='sensitive data';
      const hash1=EncryptionUtils.hash(data);
      const hash2=EncryptionUtils.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256
    });

    it('should produce different hashes for different data',()=>{
      const hash1=EncryptionUtils.hash('data1');
      const hash2=EncryptionUtils.hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Master Key Generation',()=>{
    it('should generate valid master keys',()=>{
      const key=EncryptionUtils.generateMasterKey();
      
      expect(key).toBeDefined();
      expect(key.length).toBe(64); // 32 bytes hex
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys',()=>{
      const key1=EncryptionUtils.generateMasterKey();
      const key2=EncryptionUtils.generateMasterKey();
      
      expect(key1).not.toBe(key2);
    });
  });
});

