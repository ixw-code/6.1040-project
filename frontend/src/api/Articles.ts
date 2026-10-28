import { readerClient, readerValue } from './readerClient.ts';
import { postJson } from './http.ts';

export type ArticleBlock = { block?: string; kind: 'TEXT' | 'IMAGE' | 'VIDEO'; body: string; alt: string; required: string[] };
export type CreateArticleInput = { hub: string; title: string; blocks: ArticleBlock[]; required: string[] };
export type SaveArticleInput = { hub: string; document: string; title?: string; blocks: ArticleBlock[]; required: string[] };
export type SavedBlock = Omit<ArticleBlock, 'required'> & { block: string };

export const ArticlesApi = {
  async read(hub: string, document: string) {
    return readerValue(await readerClient.articles.read({ hub, reader: 'cookie', document }));
  },
  create: (input: CreateArticleInput) => postJson<{ document: string; blocks: SavedBlock[] }>('/articles/create', input),
  editing: (hub: string, document: string) => postJson<{
    document: string; title: string; author: string;
    blocks: (Omit<ArticleBlock, 'required'> & { required: string[] | null })[];
    required: string[] | null;
  }>('/articles/editing', { hub, document }),
  save: (input: SaveArticleInput) => postJson<{
    document: string; title: string; blocks: SavedBlock[];
  }>('/articles/save', input),
  tag: (hub: string, document: string, item: string, required: string[]) =>
    postJson<{ item: string }>('/articles/tag', { hub, document, item, required }),
  untag: (hub: string, document: string, item: string) =>
    postJson<{ item: string }>('/articles/untag', { hub, document, item }),
  delete: (hub: string, document: string) => postJson<{ document: string }>('/articles/delete', { hub, document }),
};
