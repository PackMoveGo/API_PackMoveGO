import{describe,it,expect} from '@jest/globals';
import QuerySanitizer from '../../src/util/query-sanitizer';
import SanitizationUtils from '../../src/util/sanitization';

describe('Injection Prevention Tests',()=>{
  
  describe('NoSQL Injection Prevention',()=>{
    it('should remove MongoDB operators from input',()=>{
      const maliciousInput={
        email:{$ne:null},
        password:'test',
        role:{$in:['admin','manager']}
      };
      
      const sanitized=QuerySanitizer.sanitize(maliciousInput);
      
      expect(sanitized.email).toBeUndefined(); // $ne removed
      expect(sanitized.password).toBe('test'); // Safe value kept
      expect(sanitized.role).toBeUndefined(); // $in removed
    });

    it('should detect unsafe queries',()=>{
      const unsafeQuery={
        name:'John',
        $where:'this.password.length > 0'
      };
      
      const isClean=QuerySanitizer.isClean(unsafeQuery);
      expect(isClean).toBe(false);
    });

    it('should allow safe queries',()=>{
      const safeQuery={
        name:'John',
        email:'john@example.com',
        age:25
      };
      
      const isClean=QuerySanitizer.isClean(safeQuery);
      expect(isClean).toBe(true);
    });

    it('should escape regex special characters',()=>{
      const input='user@example.com';
      const escaped=QuerySanitizer.escapeRegex(input);
      
      expect(escaped).not.toContain('.');
      expect(escaped).toContain('\\.');
    });

    it('should validate ObjectId format',()=>{
      expect(QuerySanitizer.isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(QuerySanitizer.isValidObjectId('invalid')).toBe(false);
      expect(QuerySanitizer.isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Wrong length
    });

    it('should sanitize array inputs',()=>{
      const maliciousArray=[
        'safe',
        {$ne:null},
        'also safe',
        {$gt:100}
      ];
      
      const sanitized=QuerySanitizer.sanitizeArray(maliciousArray);
      
      expect(sanitized.length).toBeLessThan(maliciousArray.length);
      expect(sanitized).toContain('safe');
      expect(sanitized).toContain('also safe');
    });
  });

  describe('XSS Prevention',()=>{
    it('should escape HTML entities',()=>{
      const input='<script>alert("XSS")</script>';
      const escaped=SanitizationUtils.escapeHtml(input);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should remove script tags',()=>{
      const input='Hello <script>alert("XSS")</script> World';
      const sanitized=SanitizationUtils.sanitizeString(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove event handlers',()=>{
      const input='<div onclick="malicious()">Click me</div>';
      const sanitized=SanitizationUtils.sanitizeString(input);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('malicious');
    });

    it('should remove javascript: protocol',()=>{
      const input='<a href="javascript:alert(1)">Click</a>';
      const sanitized=SanitizationUtils.sanitizeString(input);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize nested objects',()=>{
      const input={
        name:'<script>alert(1)</script>',
        address:{
          street:'<img src=x onerror=alert(1)>',
          city:'Normal City'
        }
      };
      
      const sanitized=SanitizationUtils.sanitizeObject(input);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.address.street).not.toContain('onerror');
      expect(sanitized.address.city).toBe('Normal City');
    });

    it('should strip all HTML tags',()=>{
      const input='<div><p>Text</p></div>';
      const stripped=SanitizationUtils.stripHtmlTags(input);
      
      expect(stripped).toBe('Text');
      expect(stripped).not.toContain('<');
      expect(stripped).not.toContain('>');
    });
  });

  describe('Path Traversal Prevention',()=>{
    it('should prevent directory traversal',()=>{
      const maliciousPath='../../../etc/passwd';
      const sanitized=QuerySanitizer.sanitizeSearchInput(maliciousPath);
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should sanitize filenames',()=>{
      const malicious='../../secret.txt';
      const sanitized=SanitizationUtils.sanitizeFilename(malicious);
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });
  });

  describe('URL Validation',()=>{
    it('should allow valid HTTPS URLs',()=>{
      const url='https://example.com/page';
      expect(SanitizationUtils.isValidUrl(url)).toBe(true);
    });

    it('should allow valid HTTP URLs',()=>{
      const url='http://localhost:3000';
      expect(SanitizationUtils.isValidUrl(url)).toBe(true);
    });

    it('should reject javascript: protocol',()=>{
      const url='javascript:alert(1)';
      expect(SanitizationUtils.isValidUrl(url)).toBe(false);
    });

    it('should reject data: protocol',()=>{
      const url='data:text/html,<script>alert(1)</script>';
      expect(SanitizationUtils.isValidUrl(url)).toBe(false);
    });

    it('should sanitize malicious URLs',()=>{
      const malicious='javascript:alert(1)';
      const sanitized=SanitizationUtils.sanitizeUrl(malicious);
      
      expect(sanitized).toBe('');
    });
  });

  describe('Email Validation',()=>{
    it('should validate correct email format',()=>{
      expect(SanitizationUtils.isValidEmail('user@example.com')).toBe(true);
      expect(SanitizationUtils.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats',()=>{
      expect(SanitizationUtils.isValidEmail('invalid')).toBe(false);
      expect(SanitizationUtils.isValidEmail('@example.com')).toBe(false);
      expect(SanitizationUtils.isValidEmail('user@')).toBe(false);
    });

    it('should normalize email addresses',()=>{
      const email='  USER@EXAMPLE.COM  ';
      const sanitized=SanitizationUtils.sanitizeEmail(email);
      
      expect(sanitized).toBe('user@example.com');
    });
  });

  describe('Phone Validation',()=>{
    it('should validate US phone numbers',()=>{
      expect(SanitizationUtils.isValidPhone('1234567890')).toBe(true);
      expect(SanitizationUtils.isValidPhone('+11234567890')).toBe(true);
      expect(SanitizationUtils.isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers',()=>{
      expect(SanitizationUtils.isValidPhone('123')).toBe(false);
      expect(SanitizationUtils.isValidPhone('abcdefghij')).toBe(false);
    });
  });
});

