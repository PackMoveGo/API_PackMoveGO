import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
    isAdmin: boolean;
  };
  token?: string;
  message?: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

class AuthDataService {
  private usersDataPath: string;
  private jwtSecret: string;

  constructor() {
    this.usersDataPath = path.join(__dirname, '../data/users.json');
    this.jwtSecret = process.env['JWT_SECRET'] || 'your-jwt-secret-key';
  }

  /**
   * Load users from data file
   */
  private loadUsers(): User[] {
    try {
      const data = fs.readFileSync(this.usersDataPath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.users || [];
    } catch (error) {
      console.error('Error loading users data:', error);
      return [];
    }
  }

  /**
   * Save users to data file
   */
  private saveUsers(users: User[]): void {
    try {
      const data = fs.readFileSync(this.usersDataPath, 'utf8');
      const parsed = JSON.parse(data);
      parsed.users = users;
      fs.writeFileSync(this.usersDataPath, JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error('Error saving users data:', error);
    }
  }

  /**
   * Find user by email
   */
  private findUserByEmail(email: string): User | undefined {
    const users = this.loadUsers();
    return users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() && user.isActive
    );
  }

  /**
   * Find user by ID
   */
  private findUserById(id: string): User | undefined {
    const users = this.loadUsers();
    return users.find(user => user.id === id && user.isActive);
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   */
  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h'
    });
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Login user
   */
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const { email, password } = credentials;

      // Validate input
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Find user
      const user = this.findUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate token
      const token = this.generateToken(user);

      // Update last login
      this.updateLastLogin(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions,
          isAdmin: user.role === 'admin'
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Register new user
   */
  public async register(userData: RegisterRequest): Promise<LoginResponse> {
    try {
      const { email, password, firstName, lastName, phone } = userData;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return {
          success: false,
          message: 'All required fields must be provided'
        };
      }

      // Check if user already exists
      const existingUser = this.findUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Validate password strength
      if (password.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long'
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create new user
      const users = this.loadUsers();
      const newUser: User = {
        id: (users.length + 1).toString(),
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'user',
        isActive: true,
        permissions: ['read', 'write'],
        createdAt: new Date().toISOString()
      };

      // Add user to data
      users.push(newUser);
      this.saveUsers(users);

      // Generate token
      const token = this.generateToken(newUser);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          permissions: newUser.permissions,
          isAdmin: newUser.role === 'admin'
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Get user by ID
   */
  public getUserById(id: string) {
    const user = this.findUserById(id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      phone: user.phone,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };
  }

  /**
   * Update last login
   */
  private updateLastLogin(userId: string): void {
    try {
      const users = this.loadUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex !== -1 && users[userIndex]) {
        users[userIndex].lastLogin = new Date().toISOString();
        this.saveUsers(users);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Get all users (admin only)
   */
  public getAllUsers() {
    const users = this.loadUsers();
    return users.map(user => ({
      ...user,
      password: undefined // Don't return passwords
    }));
  }

  /**
   * Check if user has permission
   */
  public hasPermission(userId: string, permission: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    
    return user.permissions.includes(permission) || user.role === 'admin';
  }

  /**
   * Check if user is admin
   */
  public isAdmin(userId: string): boolean {
    const user = this.findUserById(userId);
    return user?.role === 'admin';
  }
}

export default new AuthDataService(); 