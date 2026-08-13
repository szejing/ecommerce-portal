# Wemotoo Portal

The merchant-facing context for managing commerce operations and the documents those operations produce.

## Language

**Document Template**:
A merchant-customizable definition for one transactional email or PDF, made from catalog-approved fields, blocks, Template Tokens, and revisions.
_Avoid_: Template

**Template Studio**:
The merchant workflow for editing, previewing, testing, saving, scheduling, publishing, and resetting Document Templates.
_Avoid_: Template editor

**Template Token**:
An allowlisted placeholder in Document Template content that resolves to contextual data when the document is rendered.
_Avoid_: Variable, merge field

**Shipment Arrangement**:
The merchant workflow for exporting pending delivery fulfillments and importing courier and tracking updates through preview and concurrency validation.
_Avoid_: Shipment import, courier upload

**Order History**:
The merchant-facing collection of orders and converted sales, and the loaded record for one of those entries.
_Avoid_: Orders list, sales list, bill detail
