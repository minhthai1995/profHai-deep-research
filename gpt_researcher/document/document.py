import asyncio
import os
import logging
from typing import List, Union
from langchain_community.document_loaders import (
    PyMuPDFLoader,
    TextLoader,
    UnstructuredCSVLoader,
    UnstructuredExcelLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPowerPointLoader,
    UnstructuredWordDocumentLoader
)
from langchain_community.document_loaders import BSHTMLLoader


class DocumentLoader:

    def __init__(self, path: Union[str, List[str]]):
        self.path = path
        self.logger = logging.getLogger('document')

    async def load(self) -> list:
        tasks = []
        if isinstance(self.path, list):
            for file_path in self.path:
                if os.path.isfile(file_path):  # Ensure it's a valid file
                    filename = os.path.basename(file_path)
                    file_name, file_extension_with_dot = os.path.splitext(filename)
                    file_extension = file_extension_with_dot.strip(".").lower()
                    tasks.append(self._load_document(file_path, file_extension))
                    
        elif isinstance(self.path, (str, bytes, os.PathLike)):
            # Check if the path is a single file
            if os.path.isfile(self.path):
                filename = os.path.basename(self.path)
                file_name, file_extension_with_dot = os.path.splitext(filename)
                file_extension = file_extension_with_dot.strip(".").lower()
                tasks.append(self._load_document(self.path, file_extension))
            # If it's a directory, walk through it
            elif os.path.isdir(self.path):
                for root, dirs, files in os.walk(self.path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        file_name, file_extension_with_dot = os.path.splitext(file)
                        file_extension = file_extension_with_dot.strip(".").lower()
                        tasks.append(self._load_document(file_path, file_extension))
            else:
                raise ValueError(f"Path '{self.path}' is neither a valid file nor a valid directory.")
                    
        else:
            raise ValueError("Invalid type for path. Expected str, bytes, os.PathLike, or list thereof.")

        # for root, dirs, files in os.walk(self.path):
        #     for file in files:
        #         file_path = os.path.join(root, file)
        #         file_name, file_extension_with_dot = os.path.splitext(file_path)
        #         file_extension = file_extension_with_dot.strip(".")
        #         tasks.append(self._load_document(file_path, file_extension))

        docs = []
        for pages in await asyncio.gather(*tasks):
            for page in pages:
                if page.page_content:
                    content_preview = page.page_content[:200] if page.page_content else "EMPTY"
                    self.logger.info(f"Loaded page from {page.metadata.get('source', 'unknown')}: {len(page.page_content)} chars")
                    self.logger.info(f"Content preview: {content_preview}...")
                    docs.append({
                        "raw_content": page.page_content,
                        "url": os.path.basename(page.metadata['source'])
                    })
                else:
                    self.logger.warning(f"Empty page content from {page.metadata.get('source', 'unknown')}")
                    
        self.logger.info(f"Total documents loaded: {len(docs)}")
        if not docs:
            raise ValueError("🤷 Failed to load any documents!")

        return docs

    async def _load_document(self, file_path: str, file_extension: str) -> list:
        ret_data = []
        self.logger.info(f"Loading document: {file_path} (extension: {file_extension})")
        try:
            loader_dict = {
                "pdf": PyMuPDFLoader(file_path),
                "txt": TextLoader(file_path),
                "doc": UnstructuredWordDocumentLoader(file_path),
                "docx": UnstructuredWordDocumentLoader(file_path),
                "pptx": UnstructuredPowerPointLoader(file_path),
                "csv": UnstructuredCSVLoader(file_path, mode="elements"),
                "xls": UnstructuredExcelLoader(file_path, mode="elements"),
                "xlsx": UnstructuredExcelLoader(file_path, mode="elements"),
                "md": UnstructuredMarkdownLoader(file_path),
                "html": BSHTMLLoader(file_path),
                "htm": BSHTMLLoader(file_path)
            }

            loader = loader_dict.get(file_extension, None)
            if loader:
                try:
                    self.logger.info(f"Using loader: {type(loader).__name__}")
                    ret_data = loader.load()
                    self.logger.info(f"Loaded {len(ret_data)} pages from {file_path}")
                    
                    # Log first page content preview
                    if ret_data and ret_data[0].page_content:
                        preview = ret_data[0].page_content[:200]
                        self.logger.info(f"First page preview: {preview}...")
                    else:
                        self.logger.warning(f"No content in first page of {file_path}")
                        
                except Exception as e:
                    self.logger.error(f"Failed to load document : {file_path}")
                    self.logger.error(f"Error: {e}")
            else:
                self.logger.warning(f"No loader found for extension: {file_extension}")

        except Exception as e:
            self.logger.error(f"Failed to load document : {file_path}")
            self.logger.error(f"Error: {e}")

        return ret_data
