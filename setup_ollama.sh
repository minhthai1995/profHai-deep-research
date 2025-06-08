#!/bin/bash

# GPT-Researcher + Ollama Setup Script
# This script automates the installation and configuration of Ollama for local AI

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🤖 GPT-Researcher + Ollama Setup          ║"
echo "║                     Complete Local AI Setup                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_step "Detected macOS system"
else
    print_warning "This script is optimized for macOS. Manual installation may be required for other systems."
fi

# 1. Install Ollama
print_step "Installing Ollama..."
if command -v ollama >/dev/null 2>&1; then
    print_success "Ollama is already installed"
    ollama --version
else
    print_step "Downloading and installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
    print_success "Ollama installed successfully"
fi

# 2. Start Ollama service
print_step "Starting Ollama service..."
if pgrep -x "ollama" > /dev/null; then
    print_success "Ollama service is already running"
else
    print_step "Starting Ollama in background..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 3  # Give it time to start
    print_success "Ollama service started"
fi

# 3. Download recommended models
echo -e "\n${BLUE}📥 Downloading AI Models${NC}"
echo "This may take a while depending on your internet connection..."

# Core chat models
print_step "Downloading Mistral 7B (Recommended for most tasks)..."
ollama pull mistral:7b

print_step "Downloading Llama 3.2 3B (Fast and efficient)..."
ollama pull llama3.2:3b

# Advanced models (optional)
read -p "$(echo -e ${YELLOW}❓ Download larger models for better performance? [y/N]: ${NC})" download_large
if [[ $download_large =~ ^[Yy]$ ]]; then
    print_step "Downloading Llama 3.3 70B (High performance, requires 40GB+ RAM)..."
    ollama pull llama3.3:70b
    
    print_step "Downloading DeepSeek R1 7B (Excellent for reasoning)..."
    ollama pull deepseek-r1:7b
fi

# 4. Download embedding models
echo -e "\n${BLUE}🔗 Setting up Embedding Models${NC}"
print_step "Downloading embedding models for document processing..."

# Ask user to choose embedding model
echo "Choose an embedding model:"
echo "1. nomic-embed-text (Recommended - Good balance)"
echo "2. mxbai-embed-large (High performance)"  
echo "3. snowflake-arctic-embed (Latest)"
read -p "Enter choice [1-3] (default: 1): " embed_choice

case $embed_choice in
    2)
        EMBEDDING_MODEL="mxbai-embed-large"
        ;;
    3)
        EMBEDDING_MODEL="snowflake-arctic-embed"
        ;;
    *)
        EMBEDDING_MODEL="nomic-embed-text"
        ;;
esac

print_step "Downloading $EMBEDDING_MODEL..."
ollama pull $EMBEDDING_MODEL

# 5. Setup environment variables
print_step "Configuring environment variables..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_step "Creating .env file..."
    touch .env
fi

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Configure Ollama settings
print_step "Adding Ollama configuration to .env..."

# Remove existing Ollama configurations to avoid duplicates
sed -i '' '/^OLLAMA_BASE_URL=/d' .env 2>/dev/null || true
sed -i '' '/^FAST_LLM=/d' .env 2>/dev/null || true
sed -i '' '/^SMART_LLM=/d' .env 2>/dev/null || true
sed -i '' '/^EMBEDDING=/d' .env 2>/dev/null || true
sed -i '' '/^LLM_PROVIDER=/d' .env 2>/dev/null || true

# Add new configurations
cat >> .env << EOF

# Ollama Configuration (Added by setup_ollama.sh)
OLLAMA_BASE_URL=http://localhost:11434
FAST_LLM=ollama:mistral:7b
SMART_LLM=ollama:mistral:7b
EMBEDDING=ollama:$EMBEDDING_MODEL
LLM_PROVIDER=ollama
EOF

print_success "Environment variables configured"

# 6. Test Ollama installation
print_step "Testing Ollama installation..."

if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    print_success "Ollama API is accessible"
    
    # Test model
    print_step "Testing model response..."
    echo "Testing Mistral model..." | ollama run mistral:7b >/dev/null 2>&1 && \
    print_success "Mistral model is working correctly" || \
    print_warning "Model test failed, but installation appears complete"
else
    print_error "Ollama API is not accessible. Try running: ollama serve"
fi

# 7. Display setup summary
echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                        🎉 Setup Complete!                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📋 Setup Summary:${NC}"
echo "✓ Ollama installed and running"
echo "✓ Models downloaded: mistral:7b, llama3.2:3b"
echo "✓ Embedding model: $EMBEDDING_MODEL"
echo "✓ Environment variables configured"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Start your frontend: npm run dev"
echo "2. Start your backend: python -m uvicorn backend.server.server:app --reload"
echo "3. Upload documents and start chatting locally!"
echo ""
echo -e "${BLUE}📖 Useful Commands:${NC}"
echo "• ollama list                    - List installed models"
echo "• ollama run mistral:7b         - Test model directly"
echo "• ollama serve                  - Start Ollama service"
echo "• ollama ps                     - Show running models"
echo ""
echo -e "${GREEN}🔒 Privacy: Your data stays 100% local!${NC}"

# Optional: Open documentation
read -p "$(echo -e ${YELLOW}❓ Open Ollama documentation? [y/N]: ${NC})" open_docs
if [[ $open_docs =~ ^[Yy]$ ]]; then
    if command -v open >/dev/null 2>&1; then
        open "https://ollama.ai/docs"
    else
        echo "Visit: https://ollama.ai/docs"
    fi
fi 