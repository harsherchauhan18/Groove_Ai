import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import get_settings
import logging
import asyncio

logger = logging.getLogger(__name__)
settings = get_settings()

class FAISSManager:
    def __init__(self):
        self.index_path = settings.FAISS_INDEX_PATH
        self.dimension = settings.EMBEDDING_DIMENSION # 384 for MiniLM
        
        # Ensure data directory exists and is writable
        os.makedirs(self.index_path, exist_ok=True)
        if not os.access(self.index_path, os.W_OK):
            logger.error(f"Cannot write to FAISS path: {self.index_path}")
        
        self.index_file = os.path.join(self.index_path, "index.faiss")
        
        # Check for existing index
        if os.path.exists(self.index_file):
            try:
                self.index = faiss.read_index(self.index_file)
                if self.index.d != self.dimension:
                    logger.warning(f"Dimension mismatch (Exist:{self.index.d}, Config:{self.dimension}). Recreating index.")
                    self.index = faiss.IndexFlatL2(self.dimension)
            except Exception as e:
                logger.error(f"Failed to read index: {e}. Creating new.")
                self.index = faiss.IndexFlatL2(self.dimension)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
            
        # Initialize Sentence Transformer locally
        # Downloading weights can take a moment
        logger.info(f"Loading local embedding model: {settings.EMBEDDING_MODEL}")
        self.model = SentenceTransformer(
            settings.EMBEDDING_MODEL, 
            use_auth_token=settings.HF_TOKEN if settings.HF_TOKEN else None
        )

    def save(self):
        try:
            faiss.write_index(self.index, self.index_file)
            logger.info(f"FAISS index saved. Total vectors: {self.index.ntotal}")
        except Exception as e:
            logger.error(f"Failed to save FAISS: {e}")

    async def get_embeddings(self, texts: list[str]):
        """
        Get embeddings in a separate thread to avoid blocking the event loop.
        """
        if not texts:
            return np.zeros((0, self.dimension), dtype='float32')

        loop = asyncio.get_event_loop()
        # model.encode is a CPU-bound task, run it in a threadpool
        embeddings = await loop.run_in_executor(
            None, 
            lambda: self.model.encode(texts, convert_to_numpy=True)
        )
        return embeddings.astype('float32')

    async def add_texts(self, texts: list[str], repo_id: str, file_paths: list[str]):
        """
        Embed and add texts to index.
        """
        if not texts:
            return []
            
        try:
            embeddings = await self.get_embeddings(texts)
            
            # FAISS index add
            start_id = self.index.ntotal
            self.index.add(embeddings)
            self.save()
            
            return [str(i) for i in range(start_id, self.index.ntotal)]
        except Exception as e:
            logger.error(f"Error adding texts to FAISS: {e}")
            raise e

    def search(self, query: str, top_k: int = 5):
        """
        Search for similar chunks in the global index.
        """
        query_embedding = self.model.encode([query], convert_to_numpy=True).astype('float32')
        distances, indices = self.index.search(query_embedding, top_k)
        return indices[0].tolist(), distances[0].tolist()

# Lazy singleton
_faiss_instance = None

def get_faiss():
    global _faiss_instance
    if _faiss_instance is None:
        _faiss_instance = FAISSManager()
    return _faiss_instance
