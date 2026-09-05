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

**Shipping Summary**:
The CRM analytics report of Courier-Booking shipping money by booking day. Shown only under Sales analytics (`/analytics/sales/shipping`). Bookings made before Sale conversion surface here when the Order converts (booking day kept). Distinct from Sale Summary and Order Summary bill tables.
_Avoid_: Sale Summary shipping column, Order analytics shipping pages, one merged shipping list across Order and Sale

**Shipping Details Summary**:
The CRM analytics report of the same shipping money grain as Shipping Summary, one row per Sale. Shows Shipment Status; the daily Shipping Summary does not. Route: `/analytics/sales/shipping-details`.
_Avoid_: Shipping Summary (daily), Order History, Order-side shipping details

**Order Workbench**:
The merchant-facing workspace for visually verifying one loaded Order History record and carrying out its payment, fulfillment, communication, and status actions.
_Avoid_: Order Detail, picking checklist

**Visual Verification**:
A staff review of an Order History record's active item identities, quantities, appointments, and excluded lines before fulfillment. It records no picked, checked, or packed state.
_Avoid_: Picking completion, item check-off, packing progress

**WhatsApp Inbox**:
The merchant-scoped CRM workspace in which all of that Merchant Store's CRM Staff read and respond to WhatsApp Conversations. It is WhatsApp-specific in the first release while remaining a future participant in an omnichannel Conversations product.
_Avoid_: personal staff inbox, platform support inbox, generic omnichannel inbox (in the first release)

**Conversation Context**:
The read-only customer and recent-order summary beside a linked WhatsApp Conversation. It adds commerce context without replacing the Order Workbench.
_Avoid_: editable order sidebar, cross-merchant customer history

**Conversation Resolution**:
Marking a WhatsApp Conversation as resolved when staff believe no response is pending. A later inbound customer message reopens it.
_Avoid_: deleting a conversation, blocking a contact, permanently closing a ticket

**Conversation Thread**:
One continuing WhatsApp Conversation between the Merchant Store and a Conversation Contact. It may carry several order or support contexts and is not recreated per issue.
_Avoid_: order-specific chat, per-ticket WhatsApp conversation, duplicate contact thread

**Conversation Triage**:
The first-release WhatsApp Inbox controls: Open/Resolved filters, unread state, and search by customer, contact phone, or order number. It excludes queues, tags, teams, SLA timers, and assignment.
_Avoid_: support-operations suite, team routing, ticket queue

**Conversation Message Status**:
The visible provider-reported Sent, Delivered, Read, or Failed state of an outbound WhatsApp message when available. It is distinct from Conversation Resolution.
_Avoid_: conversation status, customer response, assumed delivery

**Conversation Message Immutability**:
The rule that CRM Staff cannot edit or delete message content in the WhatsApp Inbox. Resolution, Do Not Message, and privacy erasure are distinct controls.
_Avoid_: editing chat history, deleting inconvenient messages, changing customer content

**Conversation Audit Timeline**:
The merchant-visible record of connection changes, customer-link actions, resolve/reopen, Do Not Message changes, send attempts, and delivery status for a WhatsApp Conversation. It does not repeat message bodies in the Activity Log.
_Avoid_: Activity Log message mirror, unaudited inbox changes, chat transcript copy

**Conversation Notification**:
The real-time unread indicator and in-app notification for a new inbound WhatsApp message. It does not send CRM Staff an email in the first release.
_Avoid_: email alert, customer notification, polling-only inbox

**Do Not Message**:
The visible state preventing CRM Staff from sending WhatsApp messages to a Conversation Contact until they explicitly clear it. It does not hide or block that contact's inbound messages.
_Avoid_: resolved conversation, deleted contact, Customer Session revocation

**WhatsApp Connection Authority**:
The Merchant Admin-only control to connect, reconnect, or disconnect the Merchant Store's WhatsApp business account and number. It does not limit CRM Staff access to the WhatsApp Inbox.
_Avoid_: staff-wide connection control, platform routine control, conversation access

**Active WhatsApp Number**:
The one connected business number that the Merchant Store uses for its WhatsApp Inbox and storefront chat link. It takes precedence over the Legacy WhatsApp Link; a Merchant Store has only one in the first release.
_Avoid_: staff WhatsApp number, multiple active merchant numbers, Legacy WhatsApp Link (when connected)

**Legacy WhatsApp Link**:
The existing manually configured chat URL that remains available to customers only when the Merchant Store has never connected an Active WhatsApp Number. It does not provide a WhatsApp Inbox.
_Avoid_: WhatsApp Business Connection, shared-inbox number, connected chat target

**Legacy WhatsApp Fallback Eligibility**:
The rule that a Legacy WhatsApp Link remains customer-facing only for a Merchant Store that has never connected an Active WhatsApp Number. An explicit disconnect hides chat instead of restoring that link.
_Avoid_: disconnect fallback, unmanaged post-disconnect chat, active connection

**WhatsApp Connection Notice**:
The non-blocking Merchant Admin notice shown when a Merchant Store has only a Legacy WhatsApp Link, explaining that customer messages are not in the WhatsApp Inbox and offering the connection action.
_Avoid_: mandatory setup blocker, staff notice, inbox-connected state

**Manual Conversation Customer Link**:
The audited action through which CRM Staff link or unlink a Conversation Contact to an existing customer of the current Merchant Store. It does not create a new customer.
_Avoid_: chat-created Customer, unaudited contact merge, cross-merchant customer link
