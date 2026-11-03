import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, scoreRelevance, retrieveRelevantChunks } from './rag.ts';

test('chunkText splits text into numbered chunks with token counts', () => {
  const longText =
    'NovaMind AI is an advanced AI assistant platform. It supports multimodal intelligence, reasoning, and agents. ' +
    'The system features real-time search grounding, secure sandboxed execution, and memory management. ' +
    'Users can ask questions about uploaded spreadsheets, PDFs, and code repositories.';

  const chunks = chunkText(longText, 'doc-1', 'overview.txt', 100, 20);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].documentId, 'doc-1');
  assert.ok(chunks[0].tokenCount > 0);
});

test('scoreRelevance returns higher score for matching terms', () => {
  const query = 'spreadsheets and PDF analysis';
  const textMatch = 'NovaMind excels at analyzing spreadsheets and extracting key insights from PDF documents.';
  const textIrrelevant = 'The weather in San Francisco is sunny today with mild winds.';

  const score1 = scoreRelevance(query, textMatch);
  const score2 = scoreRelevance(query, textIrrelevant);

  assert.ok(score1 > score2);
  assert.ok(score1 > 0.5);
});

test('retrieveRelevantChunks filters and ranks top results', () => {
  const chunks = [
    { id: '1', documentId: 'd1', documentName: 'math.txt', chunkIndex: 0, content: 'Calculus derivatives and integrals form the core of analysis.', tokenCount: 15 },
    { id: '2', documentId: 'd1', documentName: 'sales.txt', chunkIndex: 1, content: 'Q3 revenue climbed by 34% driven by enterprise AI adoption.', tokenCount: 16 },
  ];

  const results = retrieveRelevantChunks('quarterly revenue and enterprise growth', chunks, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].chunk.id, '2');
});

test('semantic RAG extracts relevant sections from tabular and scientific documents', () => {
  const doc =
    'Solid-state lithium batteries with sulfide electrolytes reached 520 Wh/kg in 2026. ' +
    'The cold isostatic roll-to-roll bonding process lowered interface resistance significantly. ' +
    'Meanwhile, traditional liquid electrolytes suffer from dendrite propagation at high c-rates.';

  const chunks = chunkText(doc, 'battery-doc', 'SolidState.txt', 120, 20);
  const searchResults = retrieveRelevantChunks('dendrite propagation and liquid electrolytes', chunks, 1);

  assert.ok(searchResults.length > 0);
  assert.ok(searchResults[0].chunk.content.includes('dendrite'));
});
