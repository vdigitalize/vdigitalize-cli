#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# {{PROJECT_NAME}} - Git Push Script
# Created by VDigitalize CLI
# ═══════════════════════════════════════════════════════════════════════
#
# Usage: ./push.sh "commit message"
#
# This script will:
# 1. Build the frontend
# 2. Commit and push changes to all repositories:
#    - Frontend
#    - Backend
#    - Dist (production build)
#
# ═══════════════════════════════════════════════════════════════════════

# Configuration
PROJECT_NAME="{{PROJECT_NAME}}"
FRONTEND_FOLDER="{{FRONTEND_FOLDER}}"
BACKEND_FOLDER="{{BACKEND_FOLDER}}"

# Repository URLs
FRONTEND_REPO="{{FRONTEND_REPO}}"
BACKEND_REPO="{{BACKEND_REPO}}"
DIST_REPO="{{DIST_REPO}}"

# Environment URLs (if configured)
FRONTEND_STAGING_URL="{{FRONTEND_STAGING_URL}}"
BACKEND_STAGING_URL="{{BACKEND_STAGING_URL}}"
FRONTEND_PRODUCTION_URL="{{FRONTEND_PRODUCTION_URL}}"
BACKEND_PRODUCTION_URL="{{BACKEND_PRODUCTION_URL}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✔${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if commit message is provided
if [ -z "$1" ]; then
    print_error "Please provide a commit message"
    echo ""
    print_info "Usage: ./push.sh \"Your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ═══════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════

print_header "${PROJECT_NAME} - Git Push"

print_info "Commit message: ${COMMIT_MESSAGE}"
echo ""

# ─────────────────────────────────────────────────────────────────────────
# Step 1: Build Frontend
# ─────────────────────────────────────────────────────────────────────────
print_step "Building frontend..."

cd "${SCRIPT_DIR}/${FRONTEND_FOLDER}" || exit 1

if npm run build; then
    print_success "Frontend build completed"
else
    print_error "Frontend build failed"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────
# Step 2: Push Backend
# ─────────────────────────────────────────────────────────────────────────
print_header "Pushing Backend"

cd "${SCRIPT_DIR}/${BACKEND_FOLDER}" || exit 1

print_step "Staging changes..."
git add .

print_step "Committing..."
git commit -m "${COMMIT_MESSAGE}" || print_info "Nothing to commit in backend"

print_step "Pushing to remote..."
if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    print_success "Backend pushed successfully"
else
    print_info "Nothing to push or branch not set up"
fi

# ─────────────────────────────────────────────────────────────────────────
# Step 3: Push Frontend
# ─────────────────────────────────────────────────────────────────────────
print_header "Pushing Frontend"

cd "${SCRIPT_DIR}/${FRONTEND_FOLDER}" || exit 1

print_step "Staging changes..."
git add .

print_step "Committing..."
git commit -m "${COMMIT_MESSAGE}" || print_info "Nothing to commit in frontend"

print_step "Pushing to remote..."
if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    print_success "Frontend pushed successfully"
else
    print_info "Nothing to push or branch not set up"
fi

# ─────────────────────────────────────────────────────────────────────────
# Step 4: Push Dist
# ─────────────────────────────────────────────────────────────────────────
print_header "Pushing Dist (Production Build)"

cd "${SCRIPT_DIR}/${FRONTEND_FOLDER}/dist" || exit 1

print_step "Staging changes..."
git add .

print_step "Committing..."
git commit -m "${COMMIT_MESSAGE}" || print_info "Nothing to commit in dist"

print_step "Pushing to remote..."
if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    print_success "Dist pushed successfully"
else
    print_info "Nothing to push or branch not set up"
fi

# ─────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────
print_header "Push Complete! 🚀"

echo -e "${GREEN}All repositories have been updated.${NC}"
echo ""

if [ -n "${FRONTEND_STAGING_URL}" ]; then
    echo -e "${CYAN}Environment URLs:${NC}"
    echo ""
    echo -e "  ${YELLOW}Staging:${NC}"
    echo -e "    Frontend: ${FRONTEND_STAGING_URL}"
    echo -e "    Backend:  ${BACKEND_STAGING_URL}"
    echo ""
    echo -e "  ${YELLOW}Production:${NC}"
    echo -e "    Frontend: ${FRONTEND_PRODUCTION_URL}"
    echo -e "    Backend:  ${BACKEND_PRODUCTION_URL}"
    echo ""
fi

echo -e "${GREEN}Done!${NC}"
echo ""
