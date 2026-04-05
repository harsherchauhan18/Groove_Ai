import asyncio
import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if "?sslmode" in db_url:
    db_url = db_url.split("?")[0]

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_async_engine(db_url, connect_args={"ssl": ssl_ctx})

async def main():
    async with engine.begin() as conn:
        print("Ensuring pgvector extension...")
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
        
        print("Creating chat_threads table...")
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chat_threads (
                id UUID PRIMARY KEY,
                repo_id UUID NOT NULL,
                user_id UUID,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_chat_threads_repo ON chat_threads(repo_id);'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);'))

        print("Creating chat_messages table...")
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY,
                thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);'))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);'))

        print("Creating chat_embeddings table...")
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS chat_embeddings (
                id BIGSERIAL PRIMARY KEY,
                message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
                thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
                repo_id UUID NOT NULL,
                embedding VECTOR(384)
            );
        '''))
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_chat_embeddings_thread ON chat_embeddings(thread_id);'))

        print("Done creating chat tables.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
