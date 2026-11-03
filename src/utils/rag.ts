export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface SearchMatch {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Splits text into clean chunk sections with overlap
 */
export function chunkText(
  text: string,
  documentId: string,
  documentName: string,
  chunkSize: number = 500,
  overlap: number = 80
): DocumentChunk[] {
  if (!text || text.trim().length === 0) return [];

  // Split by double newlines or punctuation for natural semantic boundaries
  const sentences = text.split(/(?<=[.?!:\n])\s+/);
  const chunks: DocumentChunk[] = [];

  let currentChunk = '';
  let chunkIdx = 0;

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${chunkIdx}`,
        documentId,
        documentName,
        chunkIndex: chunkIdx,
        content: currentChunk.trim(),
        tokenCount: Math.ceil(currentChunk.length / 4),
      });
      chunkIdx++;
      // retain overlap
      const words = currentChunk.split(/\s+/);
      currentChunk = words.slice(-Math.min(words.length, Math.floor(overlap / 5))).join(' ') + ' ' + sentence;
    } else {
      currentChunk = currentChunk.length === 0 ? sentence : currentChunk + ' ' + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${documentId}-chunk-${chunkIdx}`,
      documentId,
      documentName,
      chunkIndex: chunkIdx,
      content: currentChunk.trim(),
      tokenCount: Math.ceil(currentChunk.length / 4),
    });
  }

  return chunks;
}

/**
 * Computes semantic keyword relevance score (cosine/BM25 style overlap)
 */
export function scoreRelevance(query: string, text: string): number {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryTerms.length === 0) return 0;

  const target = text.toLowerCase();
  let matches = 0;

  for (const term of queryTerms) {
    const regex = new RegExp(`\\b${term}`, 'g');
    const count = (target.match(regex) || []).length;
    if (count > 0) {
      matches += 1 + Math.min(count, 3) * 0.5;
    }
  }

  return matches / queryTerms.length;
}

/**
 * Retrieves the top relevant chunks for a user query
 */
export function retrieveRelevantChunks(
  query: string,
  allChunks: DocumentChunk[],
  topK: number = 4,
  minScore: number = 0.2
): SearchMatch[] {
  const scored = allChunks
    .map((chunk) => ({
      chunk,
      score: scoreRelevance(query, chunk.content),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
