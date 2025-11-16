# User Management Script

## Quick Commands

### Remove Test User

```bash
cd /Applications/cnvm11xx/SSD
node scripts/manage-users.js remove 5555555555
```

### Add Admin User

```bash
node scripts/manage-users.js add 9498997012 "PackMoveGOAdmin2!" admin admin@packmovego.com
```

### List All Users

```bash
node scripts/manage-users.js list
```

---

## Full Usage

```bash
# Add user
node scripts/manage-users.js add <phone> <password> [role] [email]

# Roles: customer, mover, manager, admin
# Default role: customer

# Examples:
node scripts/manage-users.js add 9498997012 "PackMoveGOAdmin2!" admin admin@packmovego.com
node scripts/manage-users.js add 1234567890 "SecurePass123!" customer customer@example.com
node scripts/manage-users.js add 9876543210 "MoverPass123!" mover mover@example.com

# Remove user
node scripts/manage-users.js remove <phone>

# Example:
node scripts/manage-users.js remove 5555555555

# List users
node scripts/manage-users.js list
```

---

## Notes

- Passwords are automatically hashed with bcrypt (12 rounds)
- Users are created with verified status
- Phone numbers should be 10 digits (US format)
- Email is optional but recommended

---

## Your Requested Actions

```bash
# 1. Remove test user
node scripts/manage-users.js remove 5555555555

# 2. Add admin user
node scripts/manage-users.js add 9498997012 "PackMoveGOAdmin2!" admin admin@packmovego.com

# 3. Verify
node scripts/manage-users.js list
```

