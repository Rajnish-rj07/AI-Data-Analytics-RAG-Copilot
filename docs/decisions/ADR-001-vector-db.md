# ADR-001: Use ChromaDB for Vector Storage in V1

**Date:** 2026-09-28
**Status:** Accepted

## Decision
Use ChromaDB as the vector database for the RAG pipeline in Version 1.

## Context
We need a vector store to support RAG (Retrieval-Augmented Generation) for the AI chat feature.
The options considered were:
- ChromaDB (local, open-source)
- Pinecone (managed, paid)
- Weaviate (self-hosted, complex)
- pgvector (PostgreSQL extension)

## Reasoning
| Option | Setup | Cost | V1 Fit |
|---|---|---|---|
| ChromaDB | Zero-config, file-based | Free | ✅ Perfect |
| Pinecone | Cloud signup | Paid | ❌ |
| Weaviate | Docker required | Free | ⚠️ Complex |
| pgvector | PostgreSQL needed | Free | ⚠️ Extra dependency |

## Decision
ChromaDB runs embedded in the Python process with zero extra server setup.
Data is persisted to a local directory. Perfect for V1.

## Future Impact
If V3 requires multi-user scale or distributed retrieval, ChromaDB can be
replaced with a managed service. The LangChain abstraction layer makes this swap easy.
