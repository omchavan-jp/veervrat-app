# One persistent chat thread per VA-VM pair, not per journey

Chat between a VA and VM is a single persistent thread — not one thread per journey. All conversation happens in this one thread regardless of how many journeys they share.

A journey-scoped chat model was the initial assumption (one thread per journey), but this was rejected because: (a) much of the conversation between VA and VM is not journey-specific (icebreaking, general guidance, life context); (b) a VA and VM on 5 journeys together would have 5 fragmented threads, losing the continuity of the mentoring relationship; (c) journey context can be brought into chat via entity referencing (@journey, #ERC) without requiring separate threads.

## Considered Options
- **Per-journey threads** — rejected: fragments the relationship, forces artificial context boundaries, doesn't match how human mentoring conversations actually work.
- **One thread per VA-VM pair** — chosen: mirrors a real mentoring relationship; entity referencing handles journey-specific context within the single thread.
