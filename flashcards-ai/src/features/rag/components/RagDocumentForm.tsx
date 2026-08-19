"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ragDocumentContentMaxLength,
  ragDocumentContentMinLength,
  ragDocumentNameMaxLength,
  ragDocumentNameMinLength,
  ragFileInputAccept,
  ragFileMaxSizeBytes,
  ragPdfMaxPages,
} from "@/features/rag/constants";
import {
  createRagDocumentFromFile,
  createRagDocumentFromText,
} from "@/features/rag/services/rag";
import type { RagDocument } from "@/features/rag/types";

type MaterialInputMode = "text" | "file";

interface RagDocumentFormProps {
  onCreated: (document: RagDocument) => void;
}

export function RagDocumentForm({ onCreated }: RagDocumentFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<MaterialInputMode>("text");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function selectMode(nextMode: MaterialInputMode) {
    setMode(nextMode);
    setFormError(null);
    setMessage(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setFormError(null);
    setMessage(null);

    if (nextFile) {
      setName(getFileBaseName(nextFile.name));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (
      trimmedName.length < ragDocumentNameMinLength ||
      trimmedName.length > ragDocumentNameMaxLength
    ) {
      setFormError("El nombre debe tener entre 3 y 100 caracteres.");
      return;
    }

    if (mode === "text") {
      const trimmedContent = content.trim();

      if (
        trimmedContent.length < ragDocumentContentMinLength ||
        trimmedContent.length > ragDocumentContentMaxLength
      ) {
        setFormError("El contenido debe tener entre 100 y 50.000 caracteres.");
        return;
      }
    } else {
      if (!file) {
        setFormError("Seleccioná un archivo PDF o TXT.");
        return;
      }

      const fileError = validateSelectedFile(file);

      if (fileError) {
        setFormError(fileError);
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    setMessage(null);

    try {
      let createdDocument: RagDocument;

      if (mode === "text") {
        createdDocument = await createRagDocumentFromText(
          trimmedName,
          content.trim(),
        );
      } else {
        if (!file) {
          setFormError("Seleccioná un archivo PDF o TXT.");
          return;
        }

        createdDocument = await createRagDocumentFromFile(trimmedName, file);
      }

      onCreated(createdDocument);
      resetForm();
      setMessage("Material procesado y guardado correctamente.");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos guardar el material.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName("");
    setContent("");
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="rag-document-name"
          className="block text-sm font-semibold text-zinc-800"
        >
          Nombre del material
        </label>
        <input
          id="rag-document-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={ragDocumentNameMaxLength}
          disabled={submitting}
          placeholder="Redes - TCP"
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
        />
      </div>

      <div className="mt-5">
        <span className="block text-sm font-semibold text-zinc-800">
          Fuente del material
        </span>
        <div
          className="mt-2 grid grid-cols-2 rounded-md border border-zinc-300 bg-zinc-100 p-1"
          role="group"
          aria-label="Fuente del material"
        >
          <ModeButton
            active={mode === "text"}
            disabled={submitting}
            onClick={() => selectMode("text")}
          >
            Pegar texto
          </ModeButton>
          <ModeButton
            active={mode === "file"}
            disabled={submitting}
            onClick={() => selectMode("file")}
          >
            Subir archivo
          </ModeButton>
        </div>
      </div>

      {mode === "text" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="rag-document-content"
              className="block text-sm font-semibold text-zinc-800"
            >
              Apuntes
            </label>
            <span className="text-xs text-zinc-500">
              {content.length.toLocaleString("es-AR")} / 50.000
            </span>
          </div>
          <textarea
            id="rag-document-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={ragDocumentContentMaxLength}
            disabled={submitting}
            rows={10}
            placeholder="Pegá acá el material de estudio que querés consultar..."
            className="mt-2 w-full resize-y rounded-md border border-zinc-300 px-3 py-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>
      ) : (
        <div className="mt-4">
          <label
            htmlFor="rag-document-file"
            className="block text-sm font-semibold text-zinc-800"
          >
            Archivo PDF o TXT
          </label>
          <input
            ref={fileInputRef}
            id="rag-document-file"
            type="file"
            accept={ragFileInputAccept}
            onChange={handleFileChange}
            disabled={submitting}
            className="mt-2 block w-full rounded-md border border-zinc-300 bg-white text-sm text-zinc-700 file:mr-4 file:border-0 file:border-r file:border-zinc-300 file:bg-zinc-100 file:px-4 file:py-3 file:font-semibold file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-100"
          />
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Hasta 5 MB. Los PDF pueden tener hasta {ragPdfMaxPages} páginas y
            deben incluir texto seleccionable.
          </p>

          {file ? (
            <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3">
              <p className="break-words text-sm font-semibold text-teal-950">
                {file.name}
              </p>
              <p className="mt-1 text-xs font-medium text-teal-800">
                {formatFileSize(file.size)}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 min-h-12 rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting
          ? mode === "file"
            ? "Procesando archivo..."
            : "Procesando material..."
          : "Guardar material"}
      </button>

      {formError ? (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
          {formError}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      ) : null}
    </form>
  );
}

interface ModeButtonProps {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`min-h-10 rounded-sm px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:cursor-wait disabled:opacity-60 ${
        active
          ? "bg-white text-zinc-950 shadow-sm"
          : "text-zinc-600 hover:text-zinc-950"
      }`}
    >
      {children}
    </button>
  );
}

function validateSelectedFile(file: File) {
  if (file.size === 0) {
    return "El archivo está vacío.";
  }

  if (file.size > ragFileMaxSizeBytes) {
    return "El archivo no puede superar los 5 MB.";
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (extension !== ".pdf" && extension !== ".txt") {
    return "Solo podés subir archivos PDF o TXT.";
  }

  return null;
}

function getFileBaseName(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  const baseName =
    extensionStart > 0 ? fileName.slice(0, extensionStart) : fileName;

  return baseName.trim().slice(0, ragDocumentNameMaxLength);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
