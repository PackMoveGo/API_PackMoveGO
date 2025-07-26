#!/bin/bash

# PackMoveGo Debug Server Deployment Script for Render

echo "🚀 Deploying PackMoveGo Debug Server to Render..."

# Create a new directory for the debug server
mkdir -p debug-deploy
cd debug-deploy

# Copy the debug server files
cp ../debug-server.js .
cp ../debug-package.json package.json

# Create a simple README
cat > README.md << 'EOF'
# PackMoveGo Debug Server

This is a simple debug server for testing mobile API connectivity.

## Endpoints

- `/api/health` - Health check
- `/mobile/health` - Mobile health check
- `/mobile/api` - Mobile API info
- `/mobile/debug` - Debug information
- `/mobile/data/:type` - Test data (blog, services, about)

## Usage

Deploy this to Render and use the public URL to test your mobile app.
EOF

# Create a .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
EOF

# Initialize git and push to a new repository
git init
git add .
git commit -m "Initial commit: PackMoveGo Debug Server"

echo "✅ Debug server files prepared!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Push this code to your repository:"
echo "   git remote add origin YOUR_REPO_URL"
echo "   git push -u origin main"
echo "3. Connect the repository to Render"
echo "4. Deploy and get your public URL"
echo ""
echo "🌐 Once deployed, your phone can access:"
echo "   https://YOUR_APP_NAME.onrender.com/api/health"
echo "   https://YOUR_APP_NAME.onrender.com/mobile/health"
echo ""
echo "📱 This will work from ANY phone, anywhere!" 