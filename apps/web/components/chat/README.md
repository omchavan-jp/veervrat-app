# chat

## Overview

Rich chat composition, entity mention search and document rendering.

## Interface

- Exports ChatComposer, entityMention, MentionList and MentionListRef, MessageContent and Tiptap document types [chat-composer.tsx:ChatComposer] [entity-mention.ts:entityMention] [mention-list.tsx:MentionList] [mention-list.tsx:MentionListRef] [message-content.tsx:MessageContent] [message-content.tsx:TiptapDoc] [message-content.tsx:TiptapNode] [message-content.tsx:TiptapMark].

## Invariants

- Composer sends nonempty document only when enabled and not uploading; Enter selects open suggestions instead of sending [chat-composer.tsx:ChatComposer].
- Mention searches require two trimmed characters; # searches concepts and @ searches own items [entity-mention.ts:suggestionConfig] [entity-mention.ts:entityMention].
- Rendered links permit only HTTP, HTTPS and mailto; journey and weakness mentions link to their routes [message-content.tsx:safeHref] [message-content.tsx:entityHref].

## Side Effects

- Uploads chat images, invokes onSend and clears editor; entity suggestions query API and create/destroy popup DOM [chat-composer.tsx:ChatComposer] [entity-mention.ts:suggestionConfig].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
