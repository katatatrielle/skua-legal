import { z } from "zod";

export const LinkAuthorityToResearchItemInput = z.object({
  authorityId: z.string().trim().min(1),
  researchItemId: z.string().trim().min(1),
});

export const UnlinkAuthorityFromResearchItemInput = LinkAuthorityToResearchItemInput;

export type LinkAuthorityToResearchItemInput = z.infer<typeof LinkAuthorityToResearchItemInput>;
export type UnlinkAuthorityFromResearchItemInput = z.infer<typeof UnlinkAuthorityFromResearchItemInput>;
