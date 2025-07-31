#!/bin/bash

# PackMoveGO API - Render Deployment Script
# This script helps prepare and deploy the application to Render

echo "🚀 PackMoveGO API - Render Deployment Script"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not found. Please initialize git first."
    exit 1
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Error: No remote origin found. Please add your GitHub repository."
    echo "Run: git remote add origin https://github.com/yourusername/PackMoveGO-API.git"
    exit 1
fi

echo "✅ Repository check passed"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found after build. Build may have failed."
    exit 1
fi

# Check if compiled files exist
if [ ! -f "dist/src/server.js" ]; then
    echo "❌ Error: Compiled server not found at dist/src/server.js"
    exit 1
fi

if [ ! -f "dist/src/gateway.js" ]; then
    echo "❌ Error: Compiled gateway not found at dist/src/gateway.js"
    exit 1
fi

echo "✅ Compiled files found"

# Commit and push changes
echo "📤 Committing and pushing changes..."
git add .
git commit -m "Deploy to Render - $(date)"
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Push failed! Please check your git configuration."
    exit 1
fi

echo "✅ Changes pushed to GitHub"

echo ""
echo "🎉 Deployment preparation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Connect your GitHub account"
echo "4. Select the PackMoveGO-API repository"
echo "5. Render will automatically detect render.yaml and create services"
echo "6. Set environment variables in each service"
echo "7. Monitor deployment in Render Dashboard"
echo ""
echo "📖 For detailed instructions, see RENDER_DEPLOYMENT.md"
echo ""
echo "🔗 Your repository: https://github.com/SereneAura2/PackMoveGO-API" 