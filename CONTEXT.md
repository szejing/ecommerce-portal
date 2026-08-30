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
The merchant workflow for exporting pending delivery fulfillments and importing courier and tracking updates through preview and concurrency validation. It does not overwrite a Fulfillment that has an active Courier Booking.
_Avoid_: Shipment import, courier upload, Courier Booking

**EasyParcel Connection**:
The merchant's OAuth link of their EasyParcel account to CRM. Required before Courier Booking. Charges that merchant's EasyParcel wallet. Staff Connect or Disconnect on Configuration; they never type tokens.
_Avoid_: API key, Fiuu setting, platform-owned EasyParcel account, pasting client_id/client_secret

**Courier Booking**:
The CRM workflow that quotes Standard EasyParcel services and submits one paid delivery Fulfillment. Distinct from Shipment Arrangement and from typing courier plus tracking by hand. Collection date defaults to today. AWB PDFs and the carrier tracking URL are shown when the carrier provides them. Courier Handover defaults from merchant settings and can be changed on that booking.
_Avoid_: Shipment Arrangement, auto-book on paid, OnDemand, live checkout rates

**Courier Handover**:
The merchant default for how a booked parcel meets the carrier (courier collects vs merchant drop-off). Edited on Configuration under Shipping → EasyParcel, and updated from a booking (handover plus last drop-off point). Not customer store pickup, and not `/settings/shipping` methods, zones, or couriers.
_Avoid_: Order type pickup, shipping method, EasyParcel service_id as a setting

**Order History**:
The merchant-facing collection of orders and converted sales, and the loaded record for one of those entries.
_Avoid_: Orders list, sales list, bill detail

**Order Workbench**:
The merchant-facing workspace for visually verifying one loaded Order History record and carrying out its payment, fulfillment, communication, and status actions.
_Avoid_: Order Detail, picking checklist

**Visual Verification**:
A staff review of an Order History record's active item identities, quantities, appointments, and excluded lines before fulfillment. It records no picked, checked, or packed state.
_Avoid_: Picking completion, item check-off, packing progress
