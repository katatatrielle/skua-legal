export interface WordSelectionState {
  host_available: boolean;
  host_name: string;
  platform_name: string;
  document_name: string;
  document_url: string | null;
  requirement_support: {
    word_api_14: boolean;
    shared_runtime_11: boolean;
  };
  selection_text: string;
  document_text: string;
  selection_ooxml: string | null;
  change_tracking_mode: string | null;
  status_message: string;
}

export interface WordApplyResult {
  ok: boolean;
  message: string;
  applied_anchor?: {
    type: "word_range";
    paragraph_id: string;
    char_start: number;
    char_end: number;
    page_number: null;
    quote: string;
    quote_hash: null;
    ooxml_path: string;
  } | null;
}

export interface WordLocateResult {
  ok: boolean;
  message: string;
  matched_text?: string | null;
}

export interface WordUndoResult {
  ok: boolean;
  message: string;
}

const fallback_selection =
  "Neither party may assign this Agreement without prior written consent of the other party.";

function has_office_runtime() {
  return typeof window !== "undefined" && Boolean(window.Office) && Boolean(window.Word);
}

export async function get_word_selection_state(): Promise<WordSelectionState> {
  if (!has_office_runtime()) {
      return {
        host_available: false,
        host_name: "browser-preview",
        platform_name: "web",
        document_name: "Browser Preview Document",
        document_url: null,
        requirement_support: {
          word_api_14: false,
          shared_runtime_11: false
        },
      selection_text: fallback_selection,
      document_text: fallback_selection,
      selection_ooxml: null,
      change_tracking_mode: null,
      status_message: "Office.js not detected. Showing preview data from the scaffold."
    };
  }

  const info = await Office.onReady();
  const word_api_14 = Office.context.requirements.isSetSupported("WordApi", "1.4");
  const shared_runtime_11 = Office.context.requirements.isSetSupported(
    "SharedRuntime",
    "1.1"
  );

  if (info.host !== Office.HostType.Word) {
    const document_url = get_office_document_url();
    return {
      host_available: false,
      host_name: info.host,
      platform_name: info.platform,
      document_name: derive_document_name(document_url),
      document_url,
      requirement_support: {
        word_api_14,
        shared_runtime_11
      },
      selection_text: fallback_selection,
      document_text: fallback_selection,
      selection_ooxml: null,
      change_tracking_mode: null,
      status_message: "The add-in is not running inside Word yet."
    };
  }

  try {
    return await Word.run(async (context) => {
      const document_url = get_office_document_url();
      const document = context.document;
      const selection = document.getSelection();
      const selection_ooxml = selection.getOoxml();
      const body = document.body;

      selection.load("text");
      body.load("text");
      document.load("changeTrackingMode");
      await context.sync();

      return {
        host_available: true,
        host_name: info.host,
        platform_name: info.platform,
        document_name: derive_document_name(document_url, body.text),
        document_url,
        requirement_support: {
          word_api_14,
          shared_runtime_11
        },
        selection_text: selection.text || fallback_selection,
        document_text: body.text || selection.text || fallback_selection,
        selection_ooxml: selection_ooxml.value || null,
        change_tracking_mode: document.changeTrackingMode ?? null,
        status_message: "Connected to Word. Selection and change-tracking status are live."
      };
    });
  } catch (error) {
    const document_url = get_office_document_url();
    return {
      host_available: false,
      host_name: info.host,
      platform_name: info.platform,
      document_name: derive_document_name(document_url),
      document_url,
      requirement_support: {
        word_api_14,
        shared_runtime_11
      },
      selection_text: fallback_selection,
      document_text: fallback_selection,
      selection_ooxml: null,
      change_tracking_mode: null,
      status_message: build_error_message(error, "Unable to read the current Word selection.")
    };
  }
}

export async function undo_last_word_action(): Promise<WordUndoResult> {
  if (!has_office_runtime()) {
    return {
      ok: false,
      message: "Word undo is not available in this browser preview."
    };
  }

  await Office.onReady();
  const context_with_document = Office.context as unknown as {
    document?: {
      undoAsync?: (
        callback: (result: { status: string; error?: unknown }) => void
      ) => void;
    };
  };
  const document_with_undo = context_with_document.document as {
    undoAsync?: (
      callback: (result: { status: string; error?: unknown }) => void
    ) => void;
  };

  if (typeof document_with_undo.undoAsync !== "function") {
    return {
      ok: false,
      message: "Use Word Undo (Ctrl/Cmd+Z) on this host to roll back the last applied edit."
    };
  }

  return await new Promise<WordUndoResult>((resolve) => {
    document_with_undo.undoAsync?.((result) => {
      if (String(result.status).toLowerCase() === "succeeded") {
        resolve({
          ok: true,
          message: "Undid the last Word edit."
        });
        return;
      }

      resolve({
        ok: false,
        message: build_error_message(result.error, "Unable to undo the last Word edit.")
      });
    });
  });
}

export async function apply_comment_to_selection(content: string): Promise<WordApplyResult> {
  if (!has_office_runtime()) {
    return {
      ok: false,
      message: "Office.js is not available in this browser preview, so no comment was inserted."
    };
  }

  try {
    await Office.onReady();
    const result = await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertComment(content);
      selection.load("text");
      const selection_ooxml = selection.getOoxml();
      await context.sync();

      return {
        ok: true,
        message: "Inserted a Word comment at the current selection.",
        applied_anchor: build_anchor_snapshot(selection.text, selection_ooxml.value)
      };
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      message: build_error_message(error, "Unable to insert the Word comment.")
    };
  }
}

export async function apply_redline_to_selection(
  replacement_text: string
): Promise<WordApplyResult> {
  if (!has_office_runtime()) {
    return {
      ok: false,
      message: "Office.js is not available in this browser preview, so no redline was applied."
    };
  }

  try {
    await Office.onReady();
    const result = await Word.run(async (context) => {
      const document = context.document;
      document.load("changeTrackingMode");
      const selection = document.getSelection();

      await context.sync();

      const original_mode = document.changeTrackingMode;
      if (original_mode === Word.ChangeTrackingMode.off) {
        document.changeTrackingMode = Word.ChangeTrackingMode.trackMineOnly;
      }

      selection.insertText(replacement_text, Word.InsertLocation.replace);
      selection.load("text");
      const selection_ooxml = selection.getOoxml();
      await context.sync();

      if (original_mode === Word.ChangeTrackingMode.off) {
        document.changeTrackingMode = original_mode;
        await context.sync();
      }

      return {
        ok: true,
        message:
          "Replaced the current selection. If tracking was off, the add-in temporarily enabled track changes for the edit.",
        applied_anchor: build_anchor_snapshot(selection.text, selection_ooxml.value)
      };
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      message: build_error_message(error, "Unable to apply the redline to the Word selection.")
    };
  }
}

export async function insert_text_after_selection(text: string): Promise<WordApplyResult> {
  if (!has_office_runtime()) {
    return {
      ok: false,
      message:
        "Office.js is not available in this browser preview, so no insertion was applied."
    };
  }

  try {
    await Office.onReady();
    const result = await Word.run(async (context) => {
      const document = context.document;
      document.load("changeTrackingMode");
      const selection = document.getSelection();

      await context.sync();

      const original_mode = document.changeTrackingMode;
      if (original_mode === Word.ChangeTrackingMode.off) {
        document.changeTrackingMode = Word.ChangeTrackingMode.trackMineOnly;
      }

      selection.insertText(text, "After");
      await context.sync();

      if (original_mode === Word.ChangeTrackingMode.off) {
        document.changeTrackingMode = original_mode;
        await context.sync();
      }

      return {
        ok: true,
        message:
          "Inserted the suggested fallback after the current selection. If tracking was off, the add-in temporarily enabled track changes for the edit.",
        applied_anchor: build_anchor_snapshot(text, null)
      };
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      message: build_error_message(
        error,
        "Unable to insert the suggested text after the current Word selection."
      )
    };
  }
}

export async function locate_quote_in_document(quote: string): Promise<WordLocateResult> {
  if (!has_office_runtime()) {
    return {
      ok: false,
      message:
        "Office.js is not available in this browser preview, so the add-in cannot locate the clause in Word."
    };
  }

  const search_query = build_search_query(quote);
  if (!search_query) {
    return {
      ok: false,
      message: "No anchor text is available to locate in the current document."
    };
  }

  try {
    await Office.onReady();
    const result = await Word.run(async (context) => {
      const results = context.document.body.search(search_query, {
        ignorePunct: true,
        ignoreSpace: true,
        matchCase: false
      });
      results.load("items/text");
      await context.sync();

      if (results.items.length === 0) {
        return {
          ok: false,
          message:
            "No close text match was found in the current document. Refresh the selection or rerun review on the clause you want to inspect.",
          matched_text: null
        };
      }

      const match = results.items[0];
      match.select();
      await context.sync();

      return {
        ok: true,
        message:
          results.items.length > 1
            ? `Located the closest clause in Word. ${results.items.length} matches were found, and the first one is now selected.`
            : "Located the matching clause in Word and selected it in the document.",
        matched_text: match.text ?? search_query
      };
    });

    return result;
  } catch (error) {
    return {
      ok: false,
      message: build_error_message(
        error,
        "Unable to locate the anchor text in the current Word document."
      )
    };
  }
}

function build_error_message(error: unknown, fallback_message: string) {
  if (error instanceof Error && error.message) {
    return `${fallback_message} ${error.message}`;
  }

  return fallback_message;
}

function build_anchor_snapshot(selection_text: string, selection_ooxml: string | null) {
  return {
    type: "word_range" as const,
    paragraph_id: "selection",
    char_start: 0,
    char_end: selection_text.length,
    page_number: null,
    quote: selection_text,
    quote_hash: null,
    ooxml_path: selection_ooxml ? "/selection" : "/selection"
  };
}

function build_search_query(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= 220) {
    return normalized;
  }

  const truncated = normalized.slice(0, 220);
  const boundary = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("; "),
    truncated.lastIndexOf(", "),
    truncated.lastIndexOf(" ")
  );

  return (boundary > 80 ? truncated.slice(0, boundary) : truncated).trim();
}

function derive_document_name(document_url: string | null | undefined, fallback_text?: string) {
  if (document_url) {
    const trimmed = document_url.split("?")[0] ?? document_url;
    const parts = trimmed.split("/");
    const last = parts[parts.length - 1];
    if (last) {
      return decodeURIComponent(last);
    }
  }

  if (fallback_text) {
    const first_line = fallback_text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (first_line) {
      return `${first_line.slice(0, 48)}.txt`;
    }
  }

  return "Current Word Document.txt";
}

function get_office_document_url() {
  const context_with_document = Office.context as unknown as {
    document?: {
      url?: string | null;
    };
  };
  return context_with_document.document?.url ?? null;
}
