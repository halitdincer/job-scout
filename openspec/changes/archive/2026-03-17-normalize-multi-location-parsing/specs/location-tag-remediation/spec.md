## ADDED Requirements

### Requirement: Location tag remediation command
The system SHALL provide a management command that identifies malformed or composite `LocationTag.name` values, derives normalized location tokens, and repairs relationships by re-linking affected `JobListing` records to normalized tags.

#### Scenario: Remediate composite tag into normalized tags
- **WHEN** a tag exists with `name="Chicago / Remote"` and is linked to one or more listings
- **THEN** remediation links those listings to `"Chicago"` and `"Remote"` tags

#### Scenario: Remediate serialized object tag
- **WHEN** a tag exists with a serialized object-like name derived from adapter payloads
- **THEN** remediation extracts the best available location string token and links listings to that normalized tag

### Requirement: Dry-run remediation mode
The remediation command SHALL support `--dry-run` mode that reports proposed changes without writing to the database.

#### Scenario: Dry run reports changes only
- **WHEN** remediation is run with `--dry-run`
- **THEN** the command outputs counts and sample mappings for create/relink/delete actions and performs no writes

### Requirement: Safe cleanup semantics
The remediation command SHALL only delete malformed/composite tags when they have no remaining listing associations after re-linking.

#### Scenario: Unreferenced malformed tag deleted
- **WHEN** remediation successfully re-links all listings away from a malformed tag
- **THEN** the malformed tag may be deleted

#### Scenario: Referenced malformed tag retained
- **WHEN** remediation cannot fully re-link a malformed tag
- **THEN** the tag is retained and reported as skipped or partial
