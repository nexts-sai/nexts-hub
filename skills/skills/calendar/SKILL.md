---
name: calendar
description: Manage the local Nexts calendar, inspect schedules, create or change events, and find free time. Use for calendar, schedule, agenda, appointment, meeting time, itinerary, and availability requests.
---

# Calendar

Use the native `calendar_*` tools for every operation that reads or changes the user's Nexts
calendar. Loading this skill activates those tools for the current task.

Available tools are `calendar_list_events`, `calendar_create_event`, `calendar_update_event`,
`calendar_delete_event`, and `calendar_find_availability`.

## Routing

- A calendar event reserves or describes time. Use calendar tools for appointments, meetings,
  travel, birthdays, deadlines shown on the calendar, agenda questions, and free-time searches.
- A scheduled task executes an AI prompt later. Use scheduled-task tools only when the user wants
  Nexts to run an action or send a reminder at a future time.
- Do not silently turn an event into an automation, or an automation into an event. If the user
  explicitly asks for both, create both records and explain the distinction.

## Workflow

1. Resolve relative dates using the current local date and time supplied by the system prompt.
2. Before updating or deleting an event without an exact id, call `calendar_list_events` over the
   narrowest useful range and identify the event. If multiple events match, ask the user which one.
3. Call the matching calendar tool. Never claim a mutation succeeded before its tool succeeds.
4. Briefly confirm the title and local date/time. For destructive requests, delete only the event
   the user identified; subscribed iCal events are read-only.

## Time and recurrence

- Send local ISO 8601 values such as `2026-09-24T15:30`. For all-day events, send dates and treat
  `end` as exclusive (a one-day event has the following date as its end).
- When recurrence is requested, send an RFC 5545 value containing `DTSTART` and `RRULE`, for
  example `DTSTART:20260924T073000Z\nRRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=8`.
- Never invent an end time when it materially changes the request. Ask one concise question if the
  duration cannot reasonably be inferred.

## Privacy

Calendar tools operate on the local Nexts database. Do not copy event content to account-service,
external calendar connectors, shell commands, or unrelated tools.
