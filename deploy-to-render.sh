#!/bin/bash

# 🚀 PackMoveGO API Deployment Script
# This script helps deploy the fixed API to Render

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 PackMoveGO API Deployment Script${NC}"
echo -e "${CYAN}Deploying fixes to Render...${NC}"
echo "============================================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    echo -e "${YELLOW}Please run this script from your project directory${NC}"
    exit 1
fi

# Check current status
echo -e "${BLUE}📋 Checking current git status...${NC}"
git status --porcelain

# Add all changes
echo -e "${BLUE}📦 Adding all changes...${NC}"
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    echo -e "${YELLOW}The fixes may already be committed${NC}"
else
    # Commit changes
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "Fix CORS and v0 routes for production deployment

- Add explicit CORS headers middleware
- Fix v0 routes file loading with fs.readFileSync
- Add missing health endpoints
- Ensure proper error handling for data files"

    # Push to GitHub
    echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
    else
        echo -e "${RED}❌ Failed to push to GitHub${NC}"
        exit 1
    fi
fi

echo -e "\n${CYAN}📋 Deployment Summary${NC}"
echo "============================================================"
echo -e "${GREEN}✅ Changes committed and pushed${NC}"
echo -e "${GREEN}✅ Render will auto-deploy from GitHub${NC}"
echo -e "${GREEN}✅ Build process will include our fixes${NC}"

echo -e "\n${YELLOW}⏳ Next Steps:${NC}"
echo "1. Wait for Render to detect the push (usually 1-2 minutes)"
echo "2. Monitor the deployment in your Render dashboard"
echo "3. Test the endpoints once deployment is complete"

echo -e "\n${BLUE}🔍 Test Commands (run after deployment):${NC}"
echo "curl -X GET https://api.packmovego.com/health"
echo "curl -X GET https://api.packmovego.com/v0/nav"
echo "curl -I -H \"Origin: https://www.packmovego.com\" https://api.packmovego.com/health"

echo -e "\n${CYAN}📊 Expected Results After Deployment:${NC}"
echo -e "${GREEN}✅ CORS headers present for all responses${NC}"
echo -e "${GREEN}✅ /v0/nav returns navigation data${NC}"
echo -e "${GREEN}✅ All health endpoints working${NC}"
echo -e "${GREEN}✅ Frontend can make API calls without errors${NC}"

echo -e "\n${YELLOW}⚠️  Important Notes:${NC}"
echo "- Deployment typically takes 3-5 minutes"
echo "- You can monitor progress in your Render dashboard"
echo "- Test endpoints after deployment completes"
echo "- If issues persist, check Render logs"

echo -e "\n${CYAN}🎯 Deployment URL:${NC}"
echo "https://api.packmovego.com"

echo -e "\n${GREEN}🎉 Deployment script completed!${NC}"
echo "============================================================" 