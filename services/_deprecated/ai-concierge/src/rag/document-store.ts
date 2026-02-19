import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildVocabulary,
  computeIDF,
  tfidfVector,
  cosineSimilarity,
  geminiEmbedBatch,
} from './embeddings.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;        // e.g. 'takt-engine', 'constraint-service', 'manual'
    projectId?: string;
    category: string;      // e.g. 'plan', 'constraint', 'progress', 'resource', 'knowledge'
    timestamp: string;
  };
}

interface IndexedDocument extends Document {
  tfidfVector: number[];
  geminiVector?: number[];
}

// ── Document Store ───────────────────────────────────────────────────────────

export class DocumentStore {
  private documents: IndexedDocument[] = [];
  private vocabulary: string[] = [];
  private idf: Map<string, number> = new Map();
  private genAI: GoogleGenerativeAI | null;
  private useGeminiEmbeddings = false;

  constructor(genAI: GoogleGenerativeAI | null) {
    this.genAI = genAI;
    this.useGeminiEmbeddings = genAI !== null;
  }

  /** Rebuild TF-IDF index after documents change */
  private rebuildIndex(): void {
    const texts = this.documents.map((d) => d.content);
    this.vocabulary = buildVocabulary(texts);
    this.idf = computeIDF(texts, this.vocabulary);

    for (const doc of this.documents) {
      doc.tfidfVector = tfidfVector(doc.content, this.vocabulary, this.idf);
    }
  }

  /** Add documents and rebuild index */
  async addDocuments(docs: Document[]): Promise<void> {
    const indexed: IndexedDocument[] = docs.map((d) => ({
      ...d,
      tfidfVector: [],
    }));

    this.documents.push(...indexed);
    this.rebuildIndex();

    // Optionally compute Gemini embeddings for better retrieval
    if (this.useGeminiEmbeddings && this.genAI) {
      const texts = indexed.map((d) => d.content);
      const vectors = await geminiEmbedBatch(this.genAI, texts);
      for (let i = 0; i < indexed.length; i++) {
        if (vectors[i]) {
          indexed[i].geminiVector = vectors[i]!;
        }
      }
    }
  }

  /** Retrieve top-k most relevant documents for a query */
  async retrieve(
    query: string,
    topK: number = 5,
    filter?: { projectId?: string; category?: string },
  ): Promise<{ document: Document; score: number }[]> {
    if (this.documents.length === 0) return [];

    let candidates = this.documents;

    // Apply filters
    if (filter?.projectId) {
      candidates = candidates.filter(
        (d) => !d.metadata.projectId || d.metadata.projectId === filter.projectId,
      );
    }
    if (filter?.category) {
      candidates = candidates.filter((d) => d.metadata.category === filter.category);
    }

    // Score documents
    const queryTfidf = tfidfVector(query, this.vocabulary, this.idf);

    const scored = candidates.map((doc) => {
      // TF-IDF score (always available)
      const tfidfScore = cosineSimilarity(queryTfidf, doc.tfidfVector);

      // Gemini score if available (weighted higher)
      // We skip Gemini query embedding in retrieve() for latency;
      // TF-IDF is sufficient for retrieval, Gemini embeddings improve doc-doc similarity
      return {
        document: {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
        },
        score: tfidfScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).filter((s) => s.score > 0.01);
  }

  /** Get document count */
  get size(): number {
    return this.documents.length;
  }

  /** Clear all documents */
  clear(): void {
    this.documents = [];
    this.vocabulary = [];
    this.idf = new Map();
  }

  /** Remove documents by project ID */
  removeByProject(projectId: string): number {
    const before = this.documents.length;
    this.documents = this.documents.filter(
      (d) => d.metadata.projectId !== projectId,
    );
    if (this.documents.length !== before) {
      this.rebuildIndex();
    }
    return before - this.documents.length;
  }
}
