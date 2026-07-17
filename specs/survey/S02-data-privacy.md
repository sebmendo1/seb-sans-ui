# Survey Data and Privacy

```yaml
id: S02
title: Survey data and privacy
status: ready
depends_on: [GOV, S01]
priority: P0
normative: true
```

## Data contract

- Participants receive an anonymous UUID and an unguessable session token.
- The server stores only the token hash.
- No name, email, or IP address is persisted.
- Coarse viewport, browser family, and variable-font capability may be stored.
- SQLite data and backups stay outside git.

## Research integrity

- A session snapshots its experiment, font checksum, samples, and defaults at start.
- Activating a new experiment affects only future sessions.
- Completed submissions are immutable.
- Autosaves use optimistic revisions to reject stale writes.
- Final submission is idempotent.

## Retention and export

- Admin may export normalized CSV and JSON.
- Admin may create timestamped SQLite backups.
- Exports identify experiments and font checksums, never people.

## Acceptance

- [ ] Protected session writes require the private token
- [ ] Access logs do not retain participant IPs
- [ ] Database and backups are gitignored
- [ ] Stale revisions and duplicate submissions are safely handled
