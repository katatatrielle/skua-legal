from __future__ import annotations

from app.models import (
    DocumentRecord,
    DocumentType,
    GeneratedOutput,
    IssueRecord,
    IssueStatus,
    KeyDate,
    MemoSection,
    SeverityLevel,
    SourceCitation,
    WorkspaceDetail,
    WorkspaceSummary,
)

WORKSPACE_ID = "project-redwood"

SEED_WORKSPACES: dict[str, WorkspaceDetail] = {
    WORKSPACE_ID: WorkspaceDetail(
        workspace=WorkspaceSummary(
            id=WORKSPACE_ID,
            name="Project Redwood",
            stage="Initial commercial DD",
            playbook_names=[
                "commercial-dd-basic",
                "customer-contract-sweep",
                "vendor-contract-sweep",
                "privacy-data-processing-sweep",
            ],
            document_count=4,
            issue_count=7,
            high_severity_count=3,
            last_updated="2026-04-19T15:30:00Z",
        ),
        documents=[
            DocumentRecord(
                id="doc-acme-msa",
                name="Acme Health MSA.pdf",
                doc_type=DocumentType.CUSTOMER_AGREEMENT,
                counterparty="Acme Health Inc.",
                effective_date="2023-06-01",
                expiry_date="2026-05-31",
                renewal_notice_days=60,
                auto_renews=True,
                governing_law="Delaware",
            ),
            DocumentRecord(
                id="doc-nimbus-dpa",
                name="Nimbus Cloud Hosting and DPA.docx",
                doc_type=DocumentType.VENDOR_AGREEMENT,
                counterparty="Nimbus Cloud LLC",
                effective_date="2024-01-15",
                expiry_date="2027-01-14",
                renewal_notice_days=30,
                auto_renews=True,
                governing_law="California",
            ),
            DocumentRecord(
                id="doc-northwind-partnership",
                name="Northwind Channel Partnership Agreement.pdf",
                doc_type=DocumentType.VENDOR_AGREEMENT,
                counterparty="Northwind Distribution Ltd.",
                effective_date="2022-10-01",
                expiry_date="2027-09-30",
                renewal_notice_days=90,
                auto_renews=False,
                governing_law="Ontario",
            ),
            DocumentRecord(
                id="doc-harbour-lease",
                name="Harbour Street Office Lease.pdf",
                doc_type=DocumentType.LEASE,
                counterparty="121 Harbour Holdings LP",
                effective_date="2022-09-01",
                expiry_date="2027-08-31",
                renewal_notice_days=None,
                auto_renews=False,
                governing_law="Alberta",
            ),
        ],
        issues=[
            IssueRecord(
                id="issue-acme-renewal",
                workspace_id=WORKSPACE_ID,
                document_id="doc-acme-msa",
                title="Customer MSA renews automatically unless 60 days' notice is given",
                issue_type="auto_renewal",
                severity=SeverityLevel.LOW,
                status=IssueStatus.OPEN,
                summary="The Acme MSA rolls forward for successive 12-month terms unless notice is delivered at least 60 days before the current term ends.",
                reviewer_note=None,
                counterparties=["Acme Health Inc."],
                key_dates=[
                    KeyDate(label="renewal_notice_deadline", value="2026-04-01"),
                    KeyDate(label="current_term_expiry", value="2026-05-31"),
                ],
                citations=[
                    SourceCitation(
                        document_id="doc-acme-msa",
                        page_start=18,
                        page_end=18,
                        section_heading="Section 12.1 - Term",
                        quoted_snippet="This Agreement will renew automatically for additional one-year terms unless either party gives at least sixty (60) days' prior written notice before the end of the then-current term.",
                        playbook_check_id="auto_renewal",
                    )
                ],
            ),
            IssueRecord(
                id="issue-acme-ip",
                workspace_id=WORKSPACE_ID,
                document_id="doc-acme-msa",
                title="Customer receives broad rights to usage-derived analytics",
                issue_type="ip",
                severity=SeverityLevel.MEDIUM,
                status=IssueStatus.REVIEWED,
                summary="The Acme MSA grants the customer a broad, perpetual license to benchmark and use aggregated service analytics, which should be checked against the target's current product position.",
                reviewer_note="Confirm whether telemetry outputs are core product IP.",
                counterparties=["Acme Health Inc."],
                key_dates=[],
                citations=[
                    SourceCitation(
                        document_id="doc-acme-msa",
                        page_start=11,
                        page_end=11,
                        section_heading="Section 7.4 - Service Data",
                        quoted_snippet="Provider grants Customer a perpetual, irrevocable, royalty-free license to use, reproduce and disclose all benchmark results and aggregated service analytics derived from Customer's use of the Services.",
                        playbook_check_id="ip",
                    )
                ],
            ),
            IssueRecord(
                id="issue-nimbus-privacy",
                workspace_id=WORKSPACE_ID,
                document_id="doc-nimbus-dpa",
                title="Vendor DPA imposes strict breach notification and transfer obligations",
                issue_type="privacy",
                severity=SeverityLevel.HIGH,
                status=IssueStatus.OPEN,
                summary="Nimbus must notify within 24 hours of a security incident and may use offshore subprocessors only subject to ongoing transfer-mechanism compliance.",
                reviewer_note=None,
                counterparties=["Nimbus Cloud LLC"],
                key_dates=[
                    KeyDate(label="breach_notification_window", value="24 hours"),
                ],
                citations=[
                    SourceCitation(
                        document_id="doc-nimbus-dpa",
                        page_start=6,
                        page_end=7,
                        section_heading="Schedule 2 - Security Incident Response",
                        quoted_snippet="Processor shall notify Company without undue delay, and in any event within twenty-four (24) hours, after becoming aware of any Security Incident affecting Company Data.",
                        playbook_check_id="privacy_security",
                    ),
                    SourceCitation(
                        document_id="doc-nimbus-dpa",
                        page_start=9,
                        page_end=9,
                        section_heading="Schedule 3 - International Transfers",
                        quoted_snippet="Processor may transfer Company Data outside Canada provided that Processor maintains a valid transfer mechanism and remains responsible for each Subprocessor's compliance with this Addendum.",
                        playbook_check_id="cross_border_transfers",
                    ),
                ],
            ),
            IssueRecord(
                id="issue-nimbus-liability",
                workspace_id=WORKSPACE_ID,
                document_id="doc-nimbus-dpa",
                title="Privacy and confidentiality claims sit outside the vendor liability cap",
                issue_type="liability",
                severity=SeverityLevel.HIGH,
                status=IssueStatus.OPEN,
                summary="The vendor contract excludes privacy, confidentiality, and data misuse claims from the general cap, creating effectively uncapped exposure in those categories.",
                reviewer_note=None,
                counterparties=["Nimbus Cloud LLC"],
                key_dates=[],
                citations=[
                    SourceCitation(
                        document_id="doc-nimbus-dpa",
                        page_start=14,
                        page_end=14,
                        section_heading="Section 15.3 - Excluded Claims",
                        quoted_snippet="The liability cap in Section 15.1 does not apply to breaches of confidentiality, violations of data protection law, or unauthorized use or disclosure of Company Data.",
                        playbook_check_id="liability",
                    )
                ],
            ),
            IssueRecord(
                id="issue-northwind-coc",
                workspace_id=WORKSPACE_ID,
                document_id="doc-northwind-partnership",
                title="Change-of-control requires counterparty consent",
                issue_type="change_of_control",
                severity=SeverityLevel.HIGH,
                status=IssueStatus.OPEN,
                summary="Northwind may terminate unless it affirmatively consents to a direct or indirect change of control of the target.",
                reviewer_note=None,
                counterparties=["Northwind Distribution Ltd."],
                key_dates=[],
                citations=[
                    SourceCitation(
                        document_id="doc-northwind-partnership",
                        page_start=22,
                        page_end=22,
                        section_heading="Section 16.2 - Assignment",
                        quoted_snippet="Neither party may assign this Agreement, whether by operation of law, sale of assets, merger or change of control, without the prior written consent of the other party.",
                        playbook_check_id="change_of_control",
                    )
                ],
            ),
            IssueRecord(
                id="issue-northwind-exclusivity",
                workspace_id=WORKSPACE_ID,
                document_id="doc-northwind-partnership",
                title="Channel agreement contains exclusivity and MFN-style pricing protections",
                issue_type="exclusivity",
                severity=SeverityLevel.HIGH,
                status=IssueStatus.ACCEPTED,
                summary="The target cannot appoint another Ontario distributor for the covered product line and must provide Northwind pricing no less favorable than that offered to comparable channel partners.",
                reviewer_note="Business team already flagged this as a likely carve-out topic.",
                counterparties=["Northwind Distribution Ltd."],
                key_dates=[
                    KeyDate(label="exclusivity_end_date", value="2027-09-30"),
                ],
                citations=[
                    SourceCitation(
                        document_id="doc-northwind-partnership",
                        page_start=4,
                        page_end=5,
                        section_heading="Section 2.1 - Exclusivity",
                        quoted_snippet="Supplier appoints Distributor as its exclusive reseller for the Products in Ontario during the Term and will not authorize another distributor for the Products in that territory.",
                        playbook_check_id="exclusivity",
                    ),
                    SourceCitation(
                        document_id="doc-northwind-partnership",
                        page_start=8,
                        page_end=8,
                        section_heading="Section 5.3 - Most Favored Pricing",
                        quoted_snippet="Supplier shall not offer prices, rebates or credits to any similarly situated distributor in Canada on terms more favorable than those provided to Distributor.",
                        playbook_check_id="pricing_restrictions",
                    ),
                ],
            ),
            IssueRecord(
                id="issue-harbour-lease-assignment",
                workspace_id=WORKSPACE_ID,
                document_id="doc-harbour-lease",
                title="Office lease restricts assignment and subletting",
                issue_type="assignment",
                severity=SeverityLevel.MEDIUM,
                status=IssueStatus.OVERRIDDEN,
                summary="The lease prohibits assignment or subletting without landlord consent, but the reviewer noted this is not a deal blocker if the premises will not transfer.",
                reviewer_note="Likely low practical importance if premises remain outside transaction perimeter.",
                counterparties=["121 Harbour Holdings LP"],
                key_dates=[],
                citations=[
                    SourceCitation(
                        document_id="doc-harbour-lease",
                        page_start=27,
                        page_end=27,
                        section_heading="Section 18.1 - Transfers",
                        quoted_snippet="Tenant shall not assign this Lease or sublet all or any portion of the Premises without the Landlord's prior written consent, which may be withheld in the Landlord's sole discretion.",
                        playbook_check_id="assignment",
                    )
                ],
            ),
        ],
        highlights=[
            "Three high-severity issues require early transaction-team review: Nimbus privacy carve-outs, Nimbus data obligations, and Northwind change-of-control consent.",
            "The Northwind partnership agreement contains both exclusivity and MFN-style pricing language, which may need a specific exception or consent strategy.",
            "Key upcoming date: the Acme MSA auto-renewal notice deadline falls on 2026-04-01 if the parties want to prevent the next renewal term.",
        ],
    )
}

SEED_OUTPUTS: dict[str, GeneratedOutput] = {
    WORKSPACE_ID: GeneratedOutput(
        workspace_id=WORKSPACE_ID,
        memo_title="Project Redwood - First-Pass Commercial DD Memo",
        memo_sections=[
            MemoSection(
                heading="Assignment and change-of-control",
                body="The most material consent issue appears in the Northwind Channel Partnership Agreement, which prohibits assignment by merger, sale of assets, or change of control without prior written consent. The office lease also restricts assignment and subletting, but the reviewer has flagged that item as potentially outside the transaction perimeter.",
            ),
            MemoSection(
                heading="Commercial restrictions and renewals",
                body="The Northwind channel agreement contains both territorial exclusivity and MFN-style pricing obligations that could constrain post-closing channel strategy. The Acme customer MSA renews automatically for another year unless notice is given by 2026-04-01.",
            ),
            MemoSection(
                heading="Privacy, liability, and data processing",
                body="The Nimbus hosting agreement and DPA present the sharpest risk allocation issues. Nimbus must provide security incident notice within 24 hours, remains responsible for offshore subprocessors, and is exposed outside the general liability cap for confidentiality, privacy, and Company Data misuse claims.",
            ),
        ],
        exceptions_list=[
            "Northwind Channel Partnership Agreement: prior written consent required for assignment, merger, sale of assets, or change of control.",
            "Northwind Channel Partnership Agreement: Ontario exclusivity and MFN-style pricing obligations during the term.",
            "Nimbus Cloud Hosting and DPA: 24-hour breach notice obligation and cross-border transfer compliance commitments.",
            "Nimbus Cloud Hosting and DPA: privacy and confidentiality claims carved out of liability cap.",
            "Acme Health MSA: automatic renewal unless 60 days' notice is delivered before term end.",
        ],
    )
}
