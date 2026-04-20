import { WordTaskPane } from "./word-task-pane";

type SearchParams = Promise<{
  tab?: string | string[];
  scope?: string | string[];
  action?: string | string[];
  mode?: string | string[];
}>;

export default async function HomePage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const resolved_search_params = (await Promise.resolve(searchParams ?? {})) as {
    tab?: string | string[];
    scope?: string | string[];
    action?: string | string[];
    mode?: string | string[];
  };
  const tab_param = Array.isArray(resolved_search_params.tab)
    ? resolved_search_params.tab[0]
    : resolved_search_params.tab;
  const scope_param = Array.isArray(resolved_search_params.scope)
    ? resolved_search_params.scope[0]
    : resolved_search_params.scope;
  const action_param = Array.isArray(resolved_search_params.action)
    ? resolved_search_params.action[0]
    : resolved_search_params.action;
  const mode_param = Array.isArray(resolved_search_params.mode)
    ? resolved_search_params.mode[0]
    : resolved_search_params.mode;
  const initial_tab =
    tab_param === "ask" ||
    tab_param === "draft" ||
    tab_param === "playbooks" ||
    tab_param === "standards"
      ? tab_param
      : "review";
  const initial_scope =
    scope_param === "full_document" || scope_param === "selection"
      ? scope_param
      : "selection";
  const initial_action =
    action_param === "refresh_anchors" || action_param === "export_summary"
      ? action_param
      : null;
  const initial_draft_mode =
    mode_param === "instruction" || mode_param === "improve"
      ? mode_param
      : "library";

  return (
    <WordTaskPane
      initialAction={initial_action}
      initialDraftMode={initial_draft_mode}
      initialScope={initial_scope}
      initialTab={initial_tab}
    />
  );
}
