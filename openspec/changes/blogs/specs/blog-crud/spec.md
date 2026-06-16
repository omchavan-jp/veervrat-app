## ADDED Requirements

### Requirement: Create, edit, and delete blogs

`POST /api/v1/blogs` SHALL create a blog (required title + Tiptap JSON body, sanitized server-side) as a draft for the authenticated VA or VM. `PATCH /api/v1/blogs/:id` SHALL update the author's own blog (title/body re-sanitized; publishing sets `publishedAt`). `DELETE /api/v1/blogs/:id` SHALL soft-delete the author's own blog. Non-authors SHALL NOT edit or delete.

#### Scenario: author creates a draft

- **WHEN** a VA or VM POSTs a blog with title + body
- **THEN** it is created as a draft with the sanitized body and returned

#### Scenario: author publishes

- **WHEN** the author PATCHes their draft with `isDraft:false`
- **THEN** the blog becomes published with `publishedAt` set and is indexed for search

#### Scenario: NEGATIVE — non-author cannot edit or delete

- **WHEN** a user who is not the author PATCHes or DELETEs the blog
- **THEN** the response is 403

#### Scenario: NEGATIVE — empty body rejected

- **WHEN** a blog is created with a body that is empty after sanitization
- **THEN** the response is 400

#### Scenario: NEGATIVE — unauthenticated create

- **WHEN** create is called without a session
- **THEN** the response is 401

### Requirement: List and read blogs (guest-accessible)

`GET /api/v1/blogs` SHALL return published, non-deleted blogs in reverse-chronological order, cursor-paginated, accessible to guests. `GET /api/v1/blogs/:id` SHALL return a single published, non-deleted blog with its visible comments, accessible to guests. A blog's own author MAY additionally see their own draft via an own-list filter.

#### Scenario: guest lists published blogs

- **WHEN** a guest calls `GET /api/v1/blogs`
- **THEN** published non-deleted blogs are returned, paginated; drafts and deleted blogs are absent

#### Scenario: guest reads a published blog

- **WHEN** a guest calls `GET /api/v1/blogs/:id` for a published blog
- **THEN** the blog and its visible comments are returned

#### Scenario: NEGATIVE — draft not readable by others

- **WHEN** a non-author requests a draft blog by id
- **THEN** it is not returned (404)
