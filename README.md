# 🤖 AI Researcher User Guide

Complete guide to using AI Researcher with local document analysis and advanced research capabilities.

## 📖 Table of Contents

1. [Quick Start Setup](#-quick-start-setup)
2. [Interface Overview](#-interface-overview)  
3. [Local Document Chat](#-local-document-chat)
4. [Deep Research Mode](#-deep-research-mode)
5. [Provider Selection](#-provider-selection)
6. [File Management](#-file-management)
7. [Advanced Features](#-advanced-features)
8. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start Setup

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.8+ with pip
- **4GB+ RAM** (8GB+ recommended for larger models)

### Installation Steps

1. **Clone and Setup**
   ```bash
   git clone https://github.com/assafelovic/gpt-researcher.git
   cd gpt-researcher
   npm install
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **For Local Mode (Ollama)**
   ```bash
   chmod +x setup_ollama.sh
   ./setup_ollama.sh
   ```

4. **Start Services**
   ```bash
   # Terminal 1: Backend
   python -m uvicorn backend.server.server:app --reload

   # Terminal 2: Frontend  
   npm run dev
   ```

5. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

---

## 🎛️ Interface Overview

![Interface Overview](images/interface-overview.png)

### Main Components

1. **Header Section**
   - **AI Researcher** logo and title
   - **History** button (toggle sidebar)
   - Mode selection indicators

2. **Mode Selection**
   - **Local Chat**: Document-focused conversations
   - **Deep Research**: Internet + document research
   - Automatic enable/disable based on uploaded files

3. **Document Area**
   - **Current Session Documents**: Shows uploaded files
   - **File Upload Zone**: Drag & drop interface
   - **File Management**: Individual file removal

4. **Provider Selection** (when applicable)
   - **Local Chat Mode**: Toggle between Ollama/OpenAI
   - **Deep Research Mode**: Global provider selection

5. **Input Area**
   - **Chat Input**: Multi-line text area
   - **Action Buttons**: Mode switching, submit
   - **Loading States**: Visual feedback during processing

---

## 💬 Local Document Chat

![Local Chat Interface](images/local-chat-interface.png)

### Overview

Local Document Chat allows you to have conversations with your uploaded documents using either local AI models (Ollama) or cloud models (OpenAI).

### Getting Started

1. **Upload Documents**
   ![Document Upload](images/document-upload.png)
   - Drag & drop files into the upload zone
   - Supported formats: PDF, DOCX, TXT, CSV, XLS
   - Files are processed automatically

2. **Select Provider**
   ![Provider Selection](images/provider-selection.png)
   - **Ollama (Local)**: 100% private, requires local setup
   - **OpenAI (Cloud)**: Advanced models, requires API key
   - Provider info shows setup requirements

3. **Start Chatting**
   ![Chat History](images/chat-history.png)
   - Type questions about your documents
   - View conversation history
   - Get contextual responses based on document content

### Features

- **Document Context**: AI understands your uploaded files
- **Conversation Memory**: Maintains chat history
- **Real-time Processing**: Instant responses
- **Privacy Options**: Choose local vs cloud processing
- **Multi-format Support**: Works with various document types

### Best Practices

- **Upload related documents** together for better context
- **Ask specific questions** for more accurate responses
- **Use follow-up questions** to dive deeper into topics
- **Clear context** by uploading new documents when changing topics

---

## 🔍 Deep Research Mode

![Deep Research Interface](images/deep-research-interface.png)

### Overview

Deep Research Mode combines your uploaded documents with internet research to provide comprehensive, cited reports on any topic.

### Features

1. **Hybrid Research**
   - Combines local documents with web search
   - Provides comprehensive coverage
   - Includes citations and sources

2. **Custom Research Questions**
   ![Custom Questions](images/custom-questions.png)
   - Add multiple specific research questions
   - Guide the research direction
   - Get structured answers

3. **Research Reports**
   ![Research Report](images/research-report.png)
   - Comprehensive analysis
   - Source citations
   - Multiple export formats

### Research Process

1. **Upload Context Documents** (optional)
2. **Enter Research Query** or add custom questions
3. **Select Provider** (OpenAI/Ollama for deep research)
4. **Start Research** - AI conducts comprehensive analysis
5. **Review Results** with citations and sources

### Use Cases

- **Academic Research**: Combine papers with web sources
- **Market Analysis**: Internal docs + industry research  
- **Competitive Intelligence**: Company docs + public information
- **Policy Research**: Historical documents + current trends

---

## ⚙️ Provider Selection

![Provider Configuration](images/provider-configuration.png)

### OpenAI (Cloud)

**Advantages:**
- Latest AI models (GPT-4o, GPT-4 Turbo)
- Superior reasoning capabilities
- Fast processing
- No local hardware requirements

**Requirements:**
- OpenAI API key
- Internet connection
- Usage costs apply

**Setup:**
```env
OPENAI_API_KEY=your_key_here
SMART_LLM=openai:gpt-4o-mini
FAST_LLM=openai:gpt-4o-mini
```

### Ollama (Local)

**Advantages:**
- 100% private and offline
- No usage costs after setup
- Full data control
- No internet required

**Requirements:**
- Local hardware (4GB+ RAM)
- Ollama installation
- Model downloads

**Setup:**
```bash
./setup_ollama.sh
```

**Models Available:**
- **mistral:7b**: Balanced performance
- **llama3.2:3b**: Fast responses  
- **llama3.3:70b**: Best quality (requires 40GB+ RAM)
- **phi3:mini**: Lightweight option

### Hybrid Usage

You can use different providers for different tasks:

- **Local Chat**: Ollama for privacy
- **Deep Research**: OpenAI for comprehensive analysis
- **Document Processing**: Local embeddings
- **Web Research**: Cloud models for latest information

---

## 📁 File Management

![File Management](images/file-management.png)

### Supported Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| PDF | `.pdf` | Reports, papers, manuals |
| Word | `.docx`, `.doc` | Documents, contracts |
| Text | `.txt` | Plain text files |
| CSV | `.csv` | Data tables, spreadsheets |
| Excel | `.xlsx`, `.xls` | Complex spreadsheets |

### Upload Process

1. **Single Upload**: Click to select files
2. **Bulk Upload**: Drag multiple files at once
3. **Replace Mode**: New uploads clear previous files
4. **Processing**: Automatic text extraction and indexing

### File Operations

- **View Files**: Current session documents panel
- **Remove Individual**: X button on each file
- **Clear All**: Remove all uploaded files
- **Session Persistence**: Files remain during session

### Storage

- **Backend Processing**: Files processed on server
- **Temporary Storage**: Cleared between sessions
- **Privacy**: Files not permanently stored
- **Local Mode**: All processing stays local

---

## 🔧 Advanced Features

### Environment Configuration

```env
# Core Settings
OPENAI_API_KEY=sk-your-key-here
TAVILY_API_KEY=tvly-your-key-here

# Model Configuration
SMART_LLM=openai:gpt-4o-mini
FAST_LLM=openai:gpt-4o-mini
EMBEDDING=openai:text-embedding-3-small

# Ollama Settings (if using local)
OLLAMA_BASE_URL=http://localhost:11434
LLM_PROVIDER=ollama

# Research Settings
MAX_SEARCH_RESULTS_PER_QUERY=5
TOTAL_WORDS=1000
REPORT_FORMAT=apa
```

### Custom Research Types

AI Researcher supports various research report types:

- **research_report**: General comprehensive research
- **outline_report**: Structured outline format
- **resource_report**: Resource and citation focused
- **subtopic_report**: Deep dive into specific aspects

### API Integration

For developers wanting to integrate AI Researcher:

```python
from gpt_researcher import GPTResearcher

# Initialize researcher
researcher = GPTResearcher(
    query="Your research question",
    report_type="research_report",
    report_source="hybrid"  # local, web, or hybrid
)

# Conduct research
result = await researcher.conduct_research()
report = await researcher.write_report()
```

### Keyboard Shortcuts

- **Enter**: Submit message/query
- **Shift + Enter**: New line in input
- **Cmd/Ctrl + K**: Clear input
- **Esc**: Cancel current operation

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Ollama Connection Failed

**Symptoms:**
- "Failed to connect to Ollama"
- Local chat not working

**Solutions:**
```bash
# Check if Ollama is running
ollama serve

# Test connection
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama && ollama serve
```

#### 2. Model Download Issues

**Symptoms:**
- "Model not found"
- Slow/failed downloads

**Solutions:**
```bash
# Check available models
ollama list

# Manually download model
ollama pull mistral:7b

# Check disk space (models are large)
df -h
```

#### 3. File Upload Problems

**Symptoms:**
- Files not uploading
- Processing errors

**Solutions:**
- Check file size (limit: 50MB per file)
- Verify file format is supported
- Ensure backend is running
- Check browser console for errors

#### 4. Environment Variables

**Symptoms:**
- API key errors
- Configuration not loading

**Solutions:**
```bash
# Verify .env file exists
ls -la .env

# Check environment loading
python -c "import os; print(os.getenv('OPENAI_API_KEY'))"

# Restart services after .env changes
```

#### 5. Performance Issues

**Symptoms:**
- Slow responses
- High memory usage

**Solutions:**
- Use smaller models (phi3:mini, llama3.2:3b)
- Increase system RAM
- Close other applications
- Monitor resource usage:
```bash
# Check memory usage
top -p $(pgrep ollama)

# Monitor GPU usage (if applicable)
nvidia-smi
```

### Getting Help

1. **Documentation**: Check [https://docs.gptr.dev](https://docs.gptr.dev)
2. **GitHub Issues**: [https://github.com/assafelovic/gpt-researcher/issues](https://github.com/assafelovic/gpt-researcher/issues)
3. **Community**: Join the Discord community
4. **Logs**: Check browser console and backend logs

### Best Practices

1. **Start Small**: Begin with lightweight models
2. **Test Setup**: Verify each component works independently
3. **Monitor Resources**: Keep an eye on system performance
4. **Regular Updates**: Keep Ollama and models updated
5. **Backup Config**: Save working .env configurations

---

## 📞 Support

Need help? Here are the best resources:

- **📖 Documentation**: [https://docs.gptr.dev](https://docs.gptr.dev)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/assafelovic/gpt-researcher/issues)
- **💬 Community**: Discord server link
- **📧 Email**: support@gptr.dev

---

*Last updated: January 2025*
*Version: 2.0.0*

Happy researching with AI Researcher! 🚀 