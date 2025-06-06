import json
import os
from typing import Dict, List, Any, Optional
import time

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.server.websocket_manager import WebSocketManager
from backend.server.server_utils import (
    get_config_dict, sanitize_filename,
    update_environment_variables, handle_file_upload, handle_file_deletion,
    execute_multi_agents, handle_websocket_communication
)

from backend.server.websocket_manager import run_agent
from backend.utils import write_md_to_word, write_md_to_pdf
from gpt_researcher.utils.logging_config import setup_research_logging
from gpt_researcher.utils.enum import Tone
from backend.chat.chat import ChatAgentWithMemory

import logging

# Get logger instance
logger = logging.getLogger(__name__)

# Don't override parent logger settings
logger.propagate = True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Only log to console
    ]
)

# Models


class ResearchRequest(BaseModel):
    task: str
    report_type: str
    report_source: str = "web"
    source_urls: List[str] = []
    document_urls: List[str] = []
    tone: str = "Objective"
    headers: Dict[str, str] = {}


class ConfigRequest(BaseModel):
    ANTHROPIC_API_KEY: str
    TAVILY_API_KEY: str
    LANGCHAIN_TRACING_V2: str
    LANGCHAIN_API_KEY: str
    OPENAI_API_KEY: str
    DOC_PATH: str
    RETRIEVER: str
    GOOGLE_API_KEY: str = ''
    GOOGLE_CX_KEY: str = ''
    BING_API_KEY: str = ''
    SEARCHAPI_API_KEY: str = ''
    SERPAPI_API_KEY: str = ''
    SERPER_API_KEY: str = ''
    SEARX_URL: str = ''
    XAI_API_KEY: str
    DEEPSEEK_API_KEY: str


class LocalChatRequest(BaseModel):
    message: str
    chatHistory: List[Dict[str, str]] = []


# App initialization
app = FastAPI()

# Static files and templates
app.mount("/site", StaticFiles(directory="./frontend"), name="site")
app.mount("/static", StaticFiles(directory="./frontend/static"), name="static")
templates = Jinja2Templates(directory="./frontend")

# WebSocket manager
manager = WebSocketManager()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DOC_PATH = os.getenv("DOC_PATH", "./my-docs")

# Startup event


@app.on_event("startup")
def startup_event():
    os.makedirs("outputs", exist_ok=True)
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
    # os.makedirs(DOC_PATH, exist_ok=True)  # Commented out to avoid creating the folder if not needed
    

# Routes


@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "report": None})


@app.get("/report/{research_id}")
async def read_report(request: Request, research_id: str):
    docx_path = os.path.join('outputs', f"{research_id}.docx")
    if not os.path.exists(docx_path):
        return {"message": "Report not found."}
    return FileResponse(docx_path)


async def write_report(research_request: ResearchRequest, research_id: str = None):
    report_information = await run_agent(
        task=research_request.task,
        report_type=research_request.report_type,
        report_source=research_request.report_source,
        source_urls=research_request.source_urls,
        document_urls=research_request.document_urls,
        tone=Tone[research_request.tone],
        websocket=None,
        stream_output=None,
        headers=research_request.headers,
        query_domains=[],
        config_path="",
        return_researcher=True
    )

    docx_path = await write_md_to_word(report_information[0], research_id)
    pdf_path = await write_md_to_pdf(report_information[0], research_id)
    if research_request.report_type != "multi_agents":
        report, researcher = report_information
        response = {
            "research_id": research_id,
            "research_information": {
                "source_urls": researcher.get_source_urls(),
                "research_costs": researcher.get_costs(),
                "visited_urls": list(researcher.visited_urls),
                "research_images": researcher.get_research_images(),
                # "research_sources": researcher.get_research_sources(),  # Raw content of sources may be very large
            },
            "report": report,
            "docx_path": docx_path,
            "pdf_path": pdf_path
        }
    else:
        response = { "research_id": research_id, "report": "", "docx_path": docx_path, "pdf_path": pdf_path }

    return response

@app.post("/report/")
async def generate_report(research_request: ResearchRequest, background_tasks: BackgroundTasks):
    research_id = sanitize_filename(f"task_{int(time.time())}_{research_request.task}")

    if research_request.generate_in_background:
        background_tasks.add_task(write_report, research_request=research_request, research_id=research_id)
        return {"message": "Your report is being generated in the background. Please check back later.",
                "research_id": research_id}
    else:
        response = await write_report(research_request, research_id)
        return response


@app.get("/files/")
async def list_files():
    if not os.path.exists(DOC_PATH):
        os.makedirs(DOC_PATH, exist_ok=True)
    files = os.listdir(DOC_PATH)
    print(f"Files in {DOC_PATH}: {files}")
    return {"files": files}


@app.post("/api/multi_agents")
async def run_multi_agents():
    return await execute_multi_agents(manager)


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    return await handle_file_upload(file, DOC_PATH)


@app.delete("/files/clear")
async def clear_all_files():
    """Clear all files from the documents directory"""
    try:
        if os.path.exists(DOC_PATH):
            for filename in os.listdir(DOC_PATH):
                file_path = os.path.join(DOC_PATH, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
        print(f"All files cleared from {DOC_PATH}")
        return {"message": "All files cleared successfully"}
    except Exception as e:
        print(f"Error clearing files: {e}")
        return {"message": f"Error clearing files: {str(e)}"}


@app.delete("/files/{filename}")
async def delete_file(filename: str):
    return await handle_file_deletion(filename, DOC_PATH)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await handle_websocket_communication(websocket, manager)
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


@app.post("/api/local-chat")
async def local_chat(request: LocalChatRequest):
    """Handle local chat with uploaded documents"""
    try:
        from gpt_researcher import GPTResearcher
        from openai import AsyncOpenAI
        
        # Initialize researcher for local document analysis
        researcher = GPTResearcher(
            query=request.message,
            report_type="research_report",
            report_source="local",  # Use local search
            websocket=None,
            verbose=False
        )
        
        # Conduct research on local documents
        context = await researcher.conduct_research()
        
        # Generate a conversational response instead of a full report
        client = AsyncOpenAI()
        
        # Build conversation context
        conversation_context = ""
        if request.chatHistory:
            conversation_context = "\n".join([
                f"{'User' if msg.get('type') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                for msg in request.chatHistory[-5:]  # Last 5 messages
            ])
        
        # Create a prompt for conversational response
        system_prompt = f"""You are a helpful AI assistant analyzing uploaded documents. 
        You have access to the following document content:
        
        {context}
        
        Previous conversation:
        {conversation_context}
        
        Provide a natural, conversational response to the user's question based on the document content. 
        Be concise but informative. If the information isn't in the documents, say so clearly.
        Keep the tone friendly and helpful."""
        
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return {
            "response": response.choices[0].message.content,
            "status": "success"
        }
        
    except Exception as e:
        print(f"Error in local chat: {e}")
        return {
            "response": "I apologize, but I encountered an error while processing your message. Please make sure you have uploaded documents and try again.",
            "status": "error"
        }
