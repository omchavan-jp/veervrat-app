## ADDED Requirements

### Requirement: Uploaded content that is not public SHALL NOT be readable without authorisation

An image uploaded for a private purpose SHALL NOT be retrievable by a party holding only its
storage location and no credential.

A URL that grants access purely by being known is a bearer credential. When such a URL is
permanent, access cannot be withdrawn: it survives forwarding, logging, browser history, account
deletion and anonymisation. Uploaded content is classified in `ops/data-map.md` §1 as part of the
sensitive core, alongside self-assessment material.

Unguessable names do not satisfy this requirement. Enumeration resistance limits *discovery*; it
does not limit access by anyone who obtains the name.

#### Scenario: A stranger holding the URL of a chat image

- **GIVEN** an image uploaded through the `chat` purpose
- **WHEN** a request is made for its storage location with no session, signature or credential
- **THEN** the request is refused
- **AND** the refusal comes from the storage service itself, not only from the application

#### Scenario: An experience log image after its signed URL expires

- **GIVEN** a signed URL previously issued for an `experience` image
- **WHEN** that URL is requested after its expiry
- **THEN** the request is refused
- **AND** the person viewing the log in the application still sees the image, because a fresh URL
  is issued at render time

### Requirement: Visibility SHALL be determined by upload purpose

The system SHALL decide visibility from the purpose an upload was made for, not from a global
setting and not from a per-call flag chosen by the caller.

| Purpose | Visibility |
|---|---|
| `blog` | Public |
| `experience` | Private |
| `chat` | Private |

Blog content is published deliberately, so a public, cacheable URL is correct rather than a
concession. Chat and experience content is not published, and treating all three alike would
force either needless signing of public images or exposure of private ones.

Purpose is a property of what an image is *for*, and is therefore stable. A caller-supplied flag
would place a security decision at each call site, where it can differ per feature and drift as
new callers are added.

#### Scenario: A blog image is publicly cacheable

- **GIVEN** an image uploaded through the `blog` purpose
- **WHEN** its URL is requested with no credential
- **THEN** the image is returned
- **AND** the URL does not expire

#### Scenario: A private purpose cannot be stored in a public location

- **GIVEN** an upload for the `chat` or `experience` purpose
- **WHEN** it is stored
- **THEN** it is written to a location that does not permit anonymous read
- **AND** no code path can place it in a publicly readable location

### Requirement: Stored references SHALL identify the object, not its URL

The system SHALL persist a storage key for an uploaded file. It SHALL NOT persist an absolute URL
as the durable reference.

A URL encodes the visibility policy in force when it was written. Persisting it makes every
stored row incorrect the moment that policy changes, including inside user content such as chat
messages and experience log bodies. A key names the object, which does not change when the policy
does.

This requirement holds regardless of which visibility policy is in force, including a policy
where all content is public.

#### Scenario: Visibility policy changes after content exists

- **GIVEN** stored uploads and a change to how they are served
- **WHEN** the new policy takes effect
- **THEN** existing records remain correct without being rewritten

#### Scenario: An upload record is created

- **GIVEN** a file written to object storage
- **WHEN** its record is persisted
- **THEN** the stored value is the storage key
- **AND** the URL returned to the client is derived from that key at request time
