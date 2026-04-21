import { WordTaskPane } from "./word-task-pane";

type SearchParams = Promise<{
  tab?: string | string[];
  scope?: string | string[];
}>;

export default async function HomePage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const resolved_search_params = (await Promise.resolve(searchParams ?? {})) as {
    tab?: string | string[];
    scope?: string | string[];
  };
  const tab_param = Array.isArray(resolved_search_params.tab)
    ? resolved_search_params.tab[0]
    : resolved_search_params.tab;
  const scope_param = Array.isArray(resolved_search_params.scope)
    ? resolved_search_params.scope[0]
    : resolved_search_params.scope;
  const initial_tab =
    tab_param === "ask" ||
    tab_param === "revise" ||
    tab_param === "saved" ||
    tab_param === "settings"
      ? tab_param
      : "review";
  const initial_scope =
    scope_param === "full_document" || scope_param === "selection"
      ? scope_param
      : "selection";

  return (
    <WordTaskPane
      initialScope={initial_scope}
      initialTab={initial_tab}
    />
  );
}
