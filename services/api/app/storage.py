from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"
UPLOADS_DIR = ROOT_DIR / "uploads"
DB_PATH = DATA_DIR / "skua.db"


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                stage TEXT NOT NULL,
                playbook_names_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_updated TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                stage TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_updated TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                counterparty TEXT,
                effective_date TEXT,
                expiry_date TEXT,
                renewal_notice_days INTEGER,
                auto_renews INTEGER NOT NULL,
                governing_law TEXT,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                extracted_text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_workspace_hash
            ON documents (workspace_id, file_hash);

            CREATE TABLE IF NOT EXISTS document_versions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                source_document_id TEXT,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                extracted_text TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_project_hash
            ON document_versions (project_id, file_hash);

            CREATE TABLE IF NOT EXISTS document_pages (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                section_heading TEXT NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS document_anchors (
                id TEXT PRIMARY KEY,
                document_version_id TEXT NOT NULL,
                anchor_type TEXT NOT NULL,
                page_number INTEGER,
                paragraph_id TEXT,
                char_start INTEGER,
                char_end INTEGER,
                quote TEXT NOT NULL,
                quote_hash TEXT,
                ooxml_path TEXT,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS library_items (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                document_version_id TEXT NOT NULL,
                anchor_id TEXT NOT NULL,
                document_name TEXT NOT NULL,
                title TEXT NOT NULL,
                section_heading TEXT NOT NULL,
                text TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                governing_law TEXT,
                counterparty TEXT,
                page_number INTEGER,
                source_kind TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE,
                FOREIGN KEY (anchor_id) REFERENCES document_anchors(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_library_items_project
            ON library_items (project_id, created_at);

            CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                title TEXT NOT NULL,
                issue_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                summary TEXT NOT NULL,
                reviewer_note TEXT,
                counterparties_json TEXT NOT NULL,
                key_dates_json TEXT NOT NULL,
                citations_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                document_version_id TEXT NOT NULL,
                review_type TEXT NOT NULL,
                represented_party TEXT NOT NULL,
                jurisdiction TEXT NOT NULL,
                audience TEXT NOT NULL,
                scope_mode TEXT NOT NULL,
                scope_anchor_json TEXT,
                selection_text TEXT NOT NULL,
                selection_ooxml TEXT,
                deal_context_json TEXT NOT NULL,
                markup_settings_json TEXT NOT NULL,
                playbook_ids_json TEXT NOT NULL,
                status TEXT NOT NULL,
                summary_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS review_suggestions (
                id TEXT PRIMARY KEY,
                review_run_id TEXT NOT NULL,
                anchor_id TEXT NOT NULL,
                title TEXT NOT NULL,
                issue_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                confidence REAL NOT NULL,
                explanation TEXT NOT NULL,
                supporting_excerpt TEXT NOT NULL,
                proposed_comment TEXT,
                proposed_redline_json TEXT,
                fallback_position_text TEXT,
                status TEXT NOT NULL,
                reviewer_note TEXT,
                applied_at TEXT,
                dismissed_at TEXT,
                saved_to_playbook_at TEXT,
                saved_playbook_note_id TEXT,
                saved_playbook_id TEXT,
                saved_playbook_check_id TEXT,
                latest_anchor_json TEXT,
                anchor_reconciliation_status TEXT,
                anchor_reconciliation_note TEXT,
                citations_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (review_run_id) REFERENCES review_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_suggestion_events (
                id TEXT PRIMARY KEY,
                suggestion_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_surface TEXT NOT NULL,
                status_after TEXT NOT NULL,
                note TEXT,
                client_message TEXT,
                applied_anchor_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (suggestion_id) REFERENCES review_suggestions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_run_exports (
                id TEXT PRIMARY KEY,
                review_run_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                document_version_id TEXT NOT NULL,
                summary_markdown TEXT NOT NULL,
                exported_at TEXT NOT NULL,
                FOREIGN KEY (review_run_id) REFERENCES review_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ask_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                document_version_id TEXT,
                job_id TEXT,
                selection_anchor_id TEXT,
                selection_text TEXT,
                selection_anchor_json TEXT,
                question TEXT NOT NULL,
                answer_type TEXT NOT NULL,
                source_toggles_json TEXT NOT NULL,
                status TEXT NOT NULL,
                answer_markdown TEXT NOT NULL,
                citations_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL,
                FOREIGN KEY (job_id) REFERENCES job_records(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS draft_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                document_version_id TEXT,
                job_id TEXT,
                mode TEXT NOT NULL,
                query TEXT,
                instruction TEXT,
                selection_text TEXT,
                selection_anchor_json TEXT,
                status TEXT NOT NULL,
                generated_text TEXT NOT NULL,
                citations_json TEXT NOT NULL,
                library_matches_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL,
                FOREIGN KEY (job_id) REFERENCES job_records(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS query_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                job_id TEXT,
                name TEXT,
                document_version_ids_json TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                status TEXT NOT NULL,
                rows_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (job_id) REFERENCES job_records(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS workflow_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                workflow_template_id TEXT NOT NULL,
                artifact_variant_id TEXT,
                job_id TEXT,
                name TEXT,
                document_version_ids_json TEXT NOT NULL,
                status TEXT NOT NULL,
                query_run_id TEXT,
                dd_report_id TEXT,
                rows_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (job_id) REFERENCES job_records(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS dd_reports (
                id TEXT PRIMARY KEY,
                workflow_run_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                query_run_id TEXT,
                memo_markdown TEXT NOT NULL,
                exceptions_list_json TEXT NOT NULL,
                document_summaries_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS standards_runs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                document_version_id TEXT NOT NULL,
                standards_template_id TEXT NOT NULL,
                comparison_mode TEXT NOT NULL,
                selection_text TEXT NOT NULL,
                selection_anchor_json TEXT,
                status TEXT NOT NULL,
                coverage_score REAL NOT NULL,
                missing_clauses_json TEXT NOT NULL,
                weak_clauses_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS workflow_run_events (
                id TEXT PRIMARY KEY,
                workflow_run_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_surface TEXT NOT NULL,
                previous_rows_json TEXT NOT NULL,
                diff_summary_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS dd_report_events (
                id TEXT PRIMARY KEY,
                dd_report_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor_surface TEXT NOT NULL,
                previous_memo_markdown TEXT NOT NULL,
                previous_exceptions_list_json TEXT NOT NULL,
                previous_document_summaries_json TEXT NOT NULL,
                diff_summary_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (dd_report_id) REFERENCES dd_reports(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS playbook_saved_notes (
                id TEXT PRIMARY KEY,
                playbook_id TEXT NOT NULL,
                playbook_check_id TEXT,
                suggestion_id TEXT NOT NULL,
                review_run_id TEXT NOT NULL,
                title TEXT NOT NULL,
                issue_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                note TEXT NOT NULL,
                supporting_excerpt TEXT NOT NULL,
                fallback_position_text TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (suggestion_id) REFERENCES review_suggestions(id) ON DELETE CASCADE,
                FOREIGN KEY (review_run_id) REFERENCES review_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS job_records (
                id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                status TEXT NOT NULL,
                project_id TEXT,
                document_version_id TEXT,
                export_id TEXT,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                worker_name TEXT,
                error_message TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                actor_surface TEXT NOT NULL,
                project_id TEXT,
                document_version_id TEXT,
                review_run_id TEXT,
                suggestion_id TEXT,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL,
                FOREIGN KEY (review_run_id) REFERENCES review_runs(id) ON DELETE SET NULL,
                FOREIGN KEY (suggestion_id) REFERENCES review_suggestions(id) ON DELETE SET NULL
            );
            """
        )
        ensure_column(connection, "review_suggestions", "reviewer_note", "TEXT")
        ensure_column(connection, "review_suggestions", "applied_at", "TEXT")
        ensure_column(connection, "review_suggestions", "dismissed_at", "TEXT")
        ensure_column(connection, "review_suggestions", "saved_to_playbook_at", "TEXT")
        ensure_column(connection, "review_suggestions", "saved_playbook_note_id", "TEXT")
        ensure_column(connection, "review_suggestions", "saved_playbook_id", "TEXT")
        ensure_column(connection, "review_suggestions", "saved_playbook_check_id", "TEXT")
        ensure_column(connection, "review_suggestions", "latest_anchor_json", "TEXT")
        ensure_column(connection, "playbook_saved_notes", "playbook_check_id", "TEXT")
        ensure_column(
            connection, "review_suggestions", "anchor_reconciliation_status", "TEXT"
        )
        ensure_column(
            connection, "review_suggestions", "anchor_reconciliation_note", "TEXT"
        )
        ensure_column(connection, "job_records", "worker_name", "TEXT")
        ensure_column(connection, "job_records", "error_message", "TEXT")
        ensure_column(connection, "library_items", "page_number", "INTEGER")
        ensure_column(connection, "library_items", "source_kind", "TEXT")
        ensure_column(connection, "workflow_runs", "artifact_variant_id", "TEXT")
        ensure_column(connection, "workflow_run_events", "diff_summary_json", "TEXT")
        ensure_column(connection, "dd_report_events", "diff_summary_json", "TEXT")


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_column(connection: sqlite3.Connection, table_name: str, column_name: str, column_sql: str) -> None:
    columns = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    if any(column["name"] == column_name for column in columns):
        return

    connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}")
