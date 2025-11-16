import crypto from 'crypto';

/**
 * Field-Level Encryption for Sensitive Data
 * Uses envelope encryption pattern
 */

export class EncryptionUtils{
  // Master encryption key from environment (should be 32 bytes for AES-256)
  private static readonly MASTER_KEY=process.env['ENCRYPTION_MASTER_KEY'];
  private static readonly ALGORITHM='aes-256-gcm';
  private static readonly IV_LENGTH=16;
  private static readonly AUTH_TAG_LENGTH=16;
  private static readonly KEY_LENGTH=32;

  // Validate master key on initialization
  static {
    if(process.env['NODE_ENV']==='production'){
      if(!this.MASTER_KEY||this.MASTER_KEY.length<64){
        console.warn('⚠️ ENCRYPTION_MASTER_KEY not properly configured. Field encryption disabled.');
      }
    }
  }

  /**
   * Generate a data encryption key (DEK)
   */
  private static generateDEK():Buffer{
    return crypto.randomBytes(this.KEY_LENGTH);
  }

  /**
   * Encrypt data encryption key with master key (envelope encryption)
   */
  private static encryptDEK(dek:Buffer):string{
    if(!this.MASTER_KEY){
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }

    const masterKeyBuffer=Buffer.from(this.MASTER_KEY,'hex');
    const iv=crypto.randomBytes(this.IV_LENGTH);
    const cipher=crypto.createCipheriv(this.ALGORITHM,masterKeyBuffer,iv);

    let encrypted=cipher.update(dek);
    encrypted=Buffer.concat([encrypted,cipher.final()]);

    const authTag=cipher.getAuthTag();

    // Combine iv, authTag, and encrypted DEK
    return Buffer.concat([iv,authTag,encrypted]).toString('base64');
  }

  /**
   * Decrypt data encryption key
   */
  private static decryptDEK(encryptedDEK:string):Buffer{
    if(!this.MASTER_KEY){
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }

    const masterKeyBuffer=Buffer.from(this.MASTER_KEY,'hex');
    const buffer=Buffer.from(encryptedDEK,'base64');

    const iv=buffer.slice(0,this.IV_LENGTH);
    const authTag=buffer.slice(this.IV_LENGTH,this.IV_LENGTH+this.AUTH_TAG_LENGTH);
    const encrypted=buffer.slice(this.IV_LENGTH+this.AUTH_TAG_LENGTH);

    const decipher=crypto.createDecipheriv(this.ALGORITHM,masterKeyBuffer,iv);
    decipher.setAuthTag(authTag);

    let decrypted=decipher.update(encrypted);
    decrypted=Buffer.concat([decrypted,decipher.final()]);

    return decrypted;
  }

  /**
   * Encrypt data using envelope encryption
   */
  static encrypt(plaintext:string):string|null{
    if(!this.MASTER_KEY){
      console.warn('Encryption disabled: MASTER_KEY not configured');
      return plaintext; // Return unencrypted if key not configured
    }

    try{
      // Generate DEK
      const dek=this.generateDEK();

      // Encrypt the plaintext with DEK
      const iv=crypto.randomBytes(this.IV_LENGTH);
      const cipher=crypto.createCipheriv(this.ALGORITHM,dek,iv);

      let encrypted=cipher.update(plaintext,'utf8');
      encrypted=Buffer.concat([encrypted,cipher.final()]);

      const authTag=cipher.getAuthTag();

      // Encrypt DEK with master key
      const encryptedDEK=this.encryptDEK(dek);

      // Combine encrypted DEK, IV, auth tag, and encrypted data
      const result={
        dek:encryptedDEK,
        iv:iv.toString('base64'),
        authTag:authTag.toString('base64'),
        data:encrypted.toString('base64')
      };

      return JSON.stringify(result);
    }catch(error){
      console.error('Encryption error:',error);
      return null;
    }
  }

  /**
   * Decrypt data
   */
  static decrypt(ciphertext:string):string|null{
    if(!this.MASTER_KEY){
      console.warn('Decryption disabled: MASTER_KEY not configured');
      return ciphertext; // Return as-is if key not configured
    }

    try{
      // Check if it's encrypted data
      if(!ciphertext.startsWith('{')){
        return ciphertext; // Not encrypted
      }

      const envelope=JSON.parse(ciphertext);

      // Decrypt DEK
      const dek=this.decryptDEK(envelope.dek);

      // Decrypt data with DEK
      const iv=Buffer.from(envelope.iv,'base64');
      const authTag=Buffer.from(envelope.authTag,'base64');
      const encrypted=Buffer.from(envelope.data,'base64');

      const decipher=crypto.createDecipheriv(this.ALGORITHM,dek,iv);
      decipher.setAuthTag(authTag);

      let decrypted=decipher.update(encrypted);
      decrypted=Buffer.concat([decrypted,decipher.final()]);

      return decrypted.toString('utf8');
    }catch(error){
      console.error('Decryption error:',error);
      return null;
    }
  }

  /**
   * Hash sensitive data (one-way, for comparison)
   */
  static hash(data:string):string{
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt object fields
   */
  static encryptFields(obj:any,fields:string[]):any{
    const encrypted={...obj};

    for(const field of fields){
      if(encrypted[field]){
        encrypted[field]=this.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object fields
   */
  static decryptFields(obj:any,fields:string[]):any{
    const decrypted={...obj};

    for(const field of fields){
      if(decrypted[field]){
        decrypted[field]=this.decrypt(decrypted[field]);
      }
    }

    return decrypted;
  }

  /**
   * Generate encryption key from environment or create one
   */
  static generateMasterKey():string{
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Rotate encryption key (requires re-encrypting all data)
   */
  static async rotateKey(oldKey:string,newKey:string,encryptedData:string):Promise<string|null>{
    // Temporarily set old key
    const originalKey=this.MASTER_KEY;
    
    try{
      // Decrypt with old key
      (this as any).MASTER_KEY=oldKey;
      const plaintext=this.decrypt(encryptedData);

      if(!plaintext)return null;

      // Encrypt with new key
      (this as any).MASTER_KEY=newKey;
      return this.encrypt(plaintext);
    }catch(error){
      console.error('Key rotation error:',error);
      return null;
    }finally{
      // Restore original key
      (this as any).MASTER_KEY=originalKey;
    }
  }
}

export default EncryptionUtils;

