import "server-only";

import { extractText, getDocumentProxy } from "unpdf";
import {
  ragFileMaxSizeBytes,
  ragPdfExtractionTimeoutMs,
  ragPdfMaxPages,
} from "@/features/rag/constants";

const pdfMimeTypes = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
]);
const textMimeTypes = new Set([
  "text/plain",
  "application/octet-stream",
]);
const maxPdfImagePixels = 16_777_216;

type RagFileErrorStatus = 413 | 415 | 422;

export class RagFileError extends Error {
  status: RagFileErrorStatus;

  constructor(message: string, status: RagFileErrorStatus) {
    super(message);
    this.name = "RagFileError";
    this.status = status;
  }
}

export async function extractRagFileText(file: File) {
  if (file.size === 0) {
    throw new RagFileError("El archivo está vacío.", 422);
  }

  if (file.size > ragFileMaxSizeBytes) {
    throw new RagFileError("El archivo no puede superar los 5 MB.", 413);
  }

  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  if (extension === ".pdf") {
    validateMimeType(mimeType, pdfMimeTypes);
    return extractPdfText(new Uint8Array(await file.arrayBuffer()));
  }

  if (extension === ".txt") {
    validateMimeType(mimeType, textMimeTypes);
    return extractTxtText(new Uint8Array(await file.arrayBuffer()));
  }

  throw new RagFileError("Solo podés subir archivos PDF o TXT.", 415);
}

function validateMimeType(mimeType: string, allowedMimeTypes: Set<string>) {
  if (mimeType && !allowedMimeTypes.has(mimeType)) {
    throw new RagFileError(
      "El tipo del archivo no coincide con su extensión.",
      415,
    );
  }
}

async function extractPdfText(bytes: Uint8Array) {
  if (!hasPdfSignature(bytes)) {
    throw new RagFileError("El archivo no contiene una cabecera PDF válida.", 415);
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;

  try {
    pdf = await getDocumentProxy(bytes, {
      maxImageSize: maxPdfImagePixels,
    });

    if (pdf.numPages > ragPdfMaxPages) {
      throw new RagFileError(
        `El PDF no puede superar las ${ragPdfMaxPages} páginas.`,
        422,
      );
    }

    const result = await withTimeout(
      extractText(pdf, { mergePages: true }),
      ragPdfExtractionTimeoutMs,
    );
    return normalizeExtractedText(result.text);
  } catch (error) {
    if (error instanceof RagFileError) {
      throw error;
    }

    if (error instanceof PdfExtractionTimeoutError) {
      throw new RagFileError(
        "El PDF tardó demasiado en procesarse. Probá con un archivo más pequeño.",
        422,
      );
    }

    throw new RagFileError(
      "No pudimos leer el PDF. Puede estar dañado o protegido con contraseña.",
      422,
    );
  } finally {
    if (pdf) {
      await pdf.loadingTask.destroy().catch(() => undefined);
    }
  }
}

function extractTxtText(bytes: Uint8Array) {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return normalizeExtractedText(decoder.decode(bytes));
  } catch {
    throw new RagFileError("El archivo TXT debe usar codificación UTF-8.", 422);
  }
}

function hasPdfSignature(bytes: Uint8Array) {
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return header.includes("%PDF-");
}

function getFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart >= 0 ? fileName.slice(extensionStart).toLowerCase() : "";
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

class PdfExtractionTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new PdfExtractionTimeoutError()),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
