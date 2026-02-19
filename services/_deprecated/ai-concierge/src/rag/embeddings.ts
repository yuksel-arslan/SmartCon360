import { GoogleGenerativeAI } from '@google/generative-ai';

// ── TF-IDF Embedding (Layer 1 — no API dependency) ──────────────────────────

/** Tokenize text into normalized terms */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Build vocabulary from a corpus */
export function buildVocabulary(documents: string[]): string[] {
  const termSet = new Set<string>();
  for (const doc of documents) {
    for (const term of tokenize(doc)) {
      termSet.add(term);
    }
  }
  return Array.from(termSet).sort();
}

/** Compute TF-IDF vector for a document given a vocabulary */
export function tfidfVector(text: string, vocabulary: string[], idf: Map<string, number>): number[] {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  return vocabulary.map((term) => {
    const termFreq = (tf.get(term) || 0) / Math.max(tokens.length, 1);
    const inverseDocFreq = idf.get(term) || 0;
    return termFreq * inverseDocFreq;
  });
}

/** Compute IDF for each term in the vocabulary */
export function computeIDF(documents: string[], vocabulary: string[]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = documents.length;

  for (const term of vocabulary) {
    let docCount = 0;
    for (const doc of documents) {
      if (tokenize(doc).includes(term)) docCount++;
    }
    idf.set(term, Math.log((N + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Gemini Embedding (Layer 2 — requires API key) ───────────────────────────

export async function geminiEmbed(
  genAI: GoogleGenerativeAI,
  text: string,
): Promise<number[] | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    return null;
  }
}

export async function geminiEmbedBatch(
  genAI: GoogleGenerativeAI,
  texts: string[],
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const embeddings = await Promise.all(
      batch.map((text) => geminiEmbed(genAI, text)),
    );
    results.push(...embeddings);
  }
  return results;
}
