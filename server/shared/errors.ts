export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
  }
}

export class AuthorityNotFoundError extends DomainError {
  constructor(authorityId: string) {
    super("AUTHORITY_NOT_FOUND", `Authority not found: ${authorityId}`);
  }
}

export class MatterNotFoundError extends DomainError {
  constructor(matterId: string) {
    super("MATTER_NOT_FOUND", `Matter not found: ${matterId}`);
  }
}

export class InvalidAuthorityStateError extends DomainError {
  constructor(message: string) {
    super("INVALID_AUTHORITY_STATE", message);
  }
}

export class IntakeNotAllowedError extends DomainError {
  constructor(authorityId: string) {
    super("INTAKE_NOT_ALLOWED", `Authority cannot run intake in current state: ${authorityId}`);
  }
}

export class ProvenanceReviewNotAllowedError extends DomainError {
  constructor(authorityId: string) {
    super("PROVENANCE_REVIEW_NOT_ALLOWED", `Authority cannot run provenance review: ${authorityId}`);
  }
}

export class AuthorityDecisionNotAllowedError extends DomainError {
  constructor(message: string) {
    super("AUTHORITY_DECISION_NOT_ALLOWED", message);
  }
}
