export const ragChunkSize = 1000;
export const ragChunkOverlap = 150;
export const maxRagChunks = 60;

export function splitIntoChunks(text: string) {
  const normalizedText = text.replace(/\r\n?/g, "\n").trim();
  const chunks: string[] = [];
  const step = ragChunkSize - ragChunkOverlap;

  for (let start = 0; start < normalizedText.length; start += step) {
    const chunk = normalizedText.slice(start, start + ragChunkSize).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}
