export {};

declare global {
  interface Window {
    Office?: OfficeGlobal;
    Word?: WordGlobal;
  }

  const Office: OfficeGlobal;
  const Word: WordGlobal;

  interface OfficeGlobal {
    HostType: {
      Word: string;
    };
    context: {
      host: string;
      platform: string;
      requirements: {
        isSetSupported(name: string, version: string): boolean;
      };
    };
    onReady(callback?: (info: { host: string; platform: string }) => void): Promise<{
      host: string;
      platform: string;
    }>;
    addin?: {
      showAsTaskpane(): Promise<void>;
    };
    actions?: {
      associate(name: string, handler: () => Promise<void> | void): void;
    };
  }

  interface WordGlobal {
    InsertLocation: {
      replace: string;
    };
    ChangeTrackingMode: {
      off: string;
      trackAll: string;
      trackMineOnly: string;
    };
    run<T>(callback: (context: WordRequestContext) => Promise<T>): Promise<T>;
  }

  interface WordRequestContext {
    document: WordDocument;
    sync(): Promise<void>;
  }

  interface WordDocument {
    body: WordBody;
    changeTrackingMode: string;
    load(propertyNames: string): WordDocument;
    getSelection(): WordRange;
  }

  interface WordBody {
    text: string;
    load(propertyNames: string): WordBody;
    search(searchText: string, searchOptions?: WordSearchOptions): WordRangeCollection;
  }

  interface WordSearchOptions {
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    matchCase?: boolean;
    matchPrefix?: boolean;
    matchSuffix?: boolean;
    matchWholeWord?: boolean;
    matchWildcards?: boolean;
  }

  interface WordRangeCollection {
    items: WordRange[];
    load(propertyNames: string): WordRangeCollection;
  }

  interface WordRange {
    text: string;
    load(propertyNames: string): WordRange;
    getOoxml(): {
      value: string;
    };
    insertComment(content: string): void;
    insertText(text: string, insertLocation: string): void;
    select(): void;
  }
}
