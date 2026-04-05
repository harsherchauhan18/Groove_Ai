import uuid
import httpx
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.core.database import get_db
from app.core.faiss_manager import get_faiss
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

class CreateThreadRequest(BaseModel):
    repo_id: str

@router.post("/thread")
async def create_thread(
    payload: CreateThreadRequest,
    user=Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    thread_id = str(uuid.uuid4())
    user_id = user.get("id")
    repo_id = payload.repo_id
    
    await db.execute(
        text('''
            INSERT INTO chat_threads (id, repo_id, user_id, title)
            VALUES (CAST(:id AS uuid), CAST(:repo_id AS uuid), CAST(:user_id AS uuid), 'New Chat')
        '''),
        {"id": thread_id, "repo_id": repo_id, "user_id": user_id}
    )
    await db.commit()
    
    return {"thread_id": thread_id}

@router.get("/threads")
async def get_threads(repo_id: str, user=Depends(verify_token), db: AsyncSession = Depends(get_db)):
    user_id = user.get("id")
    result = await db.execute(
        text('SELECT id, title, created_at FROM chat_threads WHERE repo_id = CAST(:repo_id AS uuid) AND user_id = CAST(:user_id AS uuid) ORDER BY created_at DESC'),
        {"repo_id": repo_id, "user_id": user_id}
    )
    threads = result.mappings().all()
    return [{"id": str(r["id"]), "title": r["title"], "created_at": r["created_at"]} for r in threads]

@router.get("/thread/{thread_id}")
async def get_messages(thread_id: str, user=Depends(verify_token), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text('SELECT id, role, content, created_at FROM chat_messages WHERE thread_id = CAST(:thread_id AS uuid) ORDER BY created_at ASC'),
        {"thread_id": thread_id}
    )
    messages = result.mappings().all()
    return [{"id": str(r["id"]), "role": r["role"], "content": r["content"], "created_at": r["created_at"]} for r in messages]

class SendMessageRequest(BaseModel):
    thread_id: str
    repo_id: str
    message: str

async def save_ai_message_and_embed(thread_id: str, repo_id: str, full_content: str, faiss_mgr):
    from app.core.database import async_session
    try:
        if not full_content or len(full_content) < 5:
            return # Skip trivial

        async with async_session() as db:
            # Save AI message
            ai_msg_id = str(uuid.uuid4())
            await db.execute(
                text('''
                    INSERT INTO chat_messages (id, thread_id, role, content)
                    VALUES (CAST(:id AS uuid), CAST(:thread_id AS uuid), 'assistant', :content)
                '''),
                {"id": ai_msg_id, "thread_id": thread_id, "content": full_content}
            )

            # Generate embedding
            embs = await faiss_mgr.get_embeddings([full_content])
            embedding_list = embs[0].tolist()

            await db.execute(
                text('''
                    INSERT INTO chat_embeddings (message_id, thread_id, repo_id, embedding)
                    VALUES (CAST(:message_id AS uuid), CAST(:thread_id AS uuid), CAST(:repo_id AS uuid), CAST(:emb AS vector))
                '''),
                {"message_id": ai_msg_id, "thread_id": thread_id, "repo_id": repo_id, "emb": str(embedding_list)}
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Error saving AI message/embedding: {e}")

@router.post("/message")
async def send_message(
    payload: SendMessageRequest,
    background_tasks: BackgroundTasks,
    user=Depends(verify_token),
    db: AsyncSession = Depends(get_db),
    faiss_mgr=Depends(get_faiss)
):
    msg_id = str(uuid.uuid4())
    
    # 1. Save User Message
    await db.execute(
        text('''
            INSERT INTO chat_messages (id, thread_id, role, content)
            VALUES (CAST(:id AS uuid), CAST(:thread_id AS uuid), 'user', :content)
        '''),
        {"id": msg_id, "thread_id": payload.thread_id, "content": payload.message}
    )

    # 2. Embed user message and store embedding
    user_embs = await faiss_mgr.get_embeddings([payload.message])
    user_emb_str = str(user_embs[0].tolist())

    await db.execute(
        text('''
            INSERT INTO chat_embeddings (message_id, thread_id, repo_id, embedding)
            VALUES (CAST(:message_id AS uuid), CAST(:thread_id AS uuid), CAST(:repo_id AS uuid), CAST(:emb AS vector))
        '''),
        {"message_id": msg_id, "thread_id": payload.thread_id, "repo_id": payload.repo_id, "emb": user_emb_str}
    )
    
    # Title logic if first message
    thread_res = await db.execute(
        text("SELECT COUNT(*) as c FROM chat_messages WHERE thread_id = CAST(:tid AS uuid)"),
        {"tid": payload.thread_id}
    )
    count = thread_res.mappings().first()["c"]
    if count == 1:
        title = payload.message[:30] + '...' if len(payload.message) > 30 else payload.message
        await db.execute(text("UPDATE chat_threads SET title = :title WHERE id = CAST(:tid AS uuid)"), {"title": title, "tid": payload.thread_id})

    await db.commit()

    # 3. Retrieve Semantic Memory (Top 3)
    mem_res = await db.execute(
        text('''
            SELECT m.content, m.role 
            FROM chat_messages m
            JOIN chat_embeddings e ON m.id = e.message_id
            WHERE e.thread_id = CAST(:thread_id AS uuid) AND m.id != CAST(:msg_id AS uuid)
            ORDER BY e.embedding <-> CAST(:emb AS vector)
            LIMIT 3
        '''),
        {"thread_id": payload.thread_id, "msg_id": msg_id, "emb": user_emb_str}
    )
    semantic_msgs = mem_res.mappings().all()

    # Retrieve Recent Chat History (Top 5)
    rec_res = await db.execute(
        text('''
            SELECT content, role FROM chat_messages 
            WHERE thread_id = CAST(:thread_id AS uuid) AND id != CAST(:msg_id AS uuid)
            ORDER BY created_at DESC LIMIT 5
        '''),
        {"thread_id": payload.thread_id, "msg_id": msg_id}
    )
    recent_msgs = rec_res.mappings().all()[::-1]

    # Retrieve Code Context FAISS
    distances, indices = faiss_mgr.index.search(user_embs, k=5)
    found_indices = indices[0].tolist()
    context_str = ""
    if found_indices and found_indices[0] != -1:
        f_idx = [str(i) for i in found_indices if i != -1]
        cr = await db.execute(
            text('SELECT content, "filePath" FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "embeddingId" = ANY(string_to_array(:emb_ids_str, \',\'))'),
            {"repo_id": payload.repo_id, "emb_ids_str": ",".join(f_idx)}
        )
        chunks = cr.fetchall()
        context_str = "\n\n".join([f"--- File: {row[1]} ---\n{row[0]}" for row in chunks])


    # 4. Construct Prompt
    memory_block = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in semantic_msgs])
    recent_block = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in recent_msgs])

    system_prompt = f"""You are an expert code assistant for this repository.
MEMORY (Relevant past context):
{memory_block}

RECENT CHAT:
{recent_block}

CODE CONTEXT (Top retrieved snippets):
{context_str}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": payload.message}
    ]

    # 5. Stream LLM Response
    async def stream_generator():
        full_response = ""
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST", "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={"model": settings.GROK_MODEL, "messages": messages, "temperature": 0.2, "stream": True},
                    timeout=60.0
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                data = json.loads(line[6:])
                                delta = data["choices"][0]["delta"].get("content", "")
                                full_response += delta
                                yield delta
                            except:
                                pass
        except Exception as e:
            logger.error(f"Groq API Stream Error: {e}")
            yield f"\n\nERROR executing query: {str(e)}"
        
        # Dispatch background task sequentially to not block StreamingResponse yield execution
        background_tasks.add_task(save_ai_message_and_embed, payload.thread_id, payload.repo_id, full_response, faiss_mgr)

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
