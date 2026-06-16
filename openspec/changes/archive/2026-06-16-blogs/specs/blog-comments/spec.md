## ADDED Requirements

### Requirement: Comment on blogs

`POST /api/v1/blogs/:id/comments` SHALL let an authenticated VA or VM add a flat (non-threaded) plain-text comment to a published blog. Guests SHALL NOT comment.

#### Scenario: authenticated user comments

- **WHEN** an authenticated user POSTs a comment on a published blog
- **THEN** the comment is created and appears in the blog's comment list

#### Scenario: NEGATIVE — guest cannot comment

- **WHEN** an unauthenticated request posts a comment
- **THEN** the response is 401

### Requirement: Delete and hide comments

`DELETE /api/v1/blogs/:id/comments/:cid` SHALL permanently (soft) delete a comment when the requester is the comment author, the blog author, or a moderator. `POST /api/v1/blogs/:id/comments/:cid/hide` SHALL hide a comment when the requester is the blog author or a moderator. A hidden comment SHALL be absent from other users' views but SHALL remain visible (marked hidden) to its own author.

#### Scenario: comment author deletes own comment

- **WHEN** the comment author deletes their comment
- **THEN** it is removed for everyone

#### Scenario: moderator deletes any comment

- **WHEN** a moderator deletes a comment they did not author on a blog they do not own
- **THEN** it is removed

#### Scenario: blog author hides a comment

- **WHEN** the blog author hides a comment on their blog
- **THEN** the comment is hidden from other readers but still shown (marked hidden) to the comment's author

#### Scenario: NEGATIVE — unrelated user cannot delete or hide

- **WHEN** a user who is not the comment author, blog author, or a moderator tries to delete or hide
- **THEN** the response is 403

### Requirement: Report a comment

`POST /api/v1/blogs/:id/comments/:cid/report` SHALL let any authenticated user flag a comment for moderator review. It SHALL mark the comment as reported and notify moderators. Repeated reports SHALL be idempotent.

#### Scenario: user reports a comment

- **WHEN** an authenticated user reports a comment
- **THEN** the comment is flagged and moderators are notified

#### Scenario: repeated report is idempotent

- **WHEN** a comment that is already reported is reported again
- **THEN** the request succeeds without duplicating the flag
