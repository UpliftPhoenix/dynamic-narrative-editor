# Scene editor → game: new export features

This describes three additions to the Twine scene editor's JSON export that the
game runtime needs to consume. The editor side is done; this document is the
contract for the in-game implementation.

Editor commits: `3c4027f1` (Text Modifier), `17fbc265` (sequence field),
`a8cc688b` (NPC proximity trigger).

## Export format recap

The editor exports a story as JSON with two arrays. Both were already there;
the new features only add tags and data inside them.

```jsonc
{
  "passages": [
    {
      "name": "Greeting",
      "tags": "npc:Shop-Keeper priority:1 textmodifier:Hints displayType:hint",
      "id": "1",
      "text": "First line\nSecond line\nThird line",
      "links": [],
      "cleanText": "First line\nSecond line\nThird line"
    }
  ],
  "data": [
    {
      "name": "Shop Keeper",
      "tags": "",
      "id": "1",
      "templateId": "npc",
      "data": { "proximityTrigger": { "triggerDistance": 12 } }
    },
    {
      "name": "Hints",
      "tags": "",
      "id": "2",
      "templateId": "textmodifier",
      "data": { "displayType": "hint", "sequence": "default" }
    }
  ]
}
```

Points that matter for parsing:

- `tags` is a single space-separated string. Split on whitespace.
- A tag link from a data node to a passage is the tag `templateId:nodeName`,
  where whitespace runs in the node name become dashes (`Shop Keeper` →
  `npc:Shop-Keeper`). The same dash rule applies to tag values below.
- Passage `text` uses `\n` between lines. Where a feature talks about "lines",
  it means these newline-separated segments of the passage text.

## 1. Text Modifier: `displayType` tag

A Text Modifier is a data node (`templateId: "textmodifier"`) that changes how
a linked passage's text is presented. The game should **read the tags on the
passage**, not resolve the node: the editor already mirrors the node's fields
onto every linked passage as tags. The node's own entry in `data` can be
ignored.

Tags a passage may carry:

| Tag | Meaning |
| --- | --- |
| `textmodifier:<Name>` | The passage is linked to a Text Modifier node. Informational only. |
| `displayType:hint` | Present the passage as a hint. |
| `displayType:bark` | Present the passage as an NPC bark. |
| *(no `displayType` tag)* | Default presentation, the same as any passage today. |

Rules the editor guarantees:

- A passage has **at most one** `textmodifier:*` link and therefore at most
  one `displayType:*` tag. Linking a second modifier replaces the first.
- The value `default` never appears as a tag. Absence of the tag means default.
- The text is unchanged. Hints and barks are the same newline-separated lines
  as a regular passage; only the presentation differs.

Values are exactly `hint` and `bark` (case-sensitive). Treat any other
`displayType:*` value as default and log it.

## 2. Text Modifier: `sequence` tag

The same Text Modifier node has a second field, mirrored the same way.

| Tag | Meaning |
| --- | --- |
| `sequence:oneShotOrdered` | Play the passage's lines one at a time, in order, one line per trigger. |
| `sequence:oneShotRandom` | Play one randomly chosen line per trigger. |
| *(no `sequence` tag)* | Default sequencing, the same as today. |

Same guarantees as `displayType`: at most one `sequence:*` tag per passage,
`default` is never emitted, values are case-sensitive.

`displayType` and `sequence` are independent. A passage can have either, both,
or neither. Whether a one-shot sequence repeats after the last line, and what
"one shot" resets on, is game-side behavior the comms team owns. Confirm the
intended semantics with them before implementing; the descriptions above are
the editor's understanding of the field names, not a spec.

## 3. NPC `proximityTrigger`

NPC data nodes (`templateId: "npc"`) can now carry data. Previously their
`data` was always `{}`, and it still is unless the author turns the trigger
on, so existing NPC handling must keep accepting an empty object.

```jsonc
{
  "name": "Shop Keeper",
  "templateId": "npc",
  "data": {
    "proximityTrigger": {
      "triggerDistance": 12,
      "retriggerDelay": 30
    }
  }
}
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `proximityTrigger` | object | no | If present, the NPC starts its dialog on its own when the player comes within range. Absent means the NPC only talks when interacted with, as today. |
| `proximityTrigger.triggerDistance` | number ≥ 0 | yes, when the object is present | Distance at which the trigger fires. Units are the game's world units; the editor does not constrain them. |
| `proximityTrigger.retriggerDelay` | number ≥ 0 | no | Minimum time before the trigger can fire again. Absent means it does not retrigger. Units are the game's; the editor does not constrain them. |

The editor enforces the types and the ≥ 0 bounds, and rejects unknown keys
inside `proximityTrigger`, so the game can trust the shape. It should still
handle a missing `proximityTrigger` gracefully.

Which passage the NPC plays when the trigger fires is resolved the same way as
an interaction today: the passages linked to the NPC carry `npc:<Name>` and
`priority:N` tags, and that mechanism is unchanged.

## Checklist for the game implementation

1. Split passage `tags` on whitespace and look up `displayType:*` and
   `sequence:*` values.
2. Route `displayType:hint` and `displayType:bark` passages to the hint and
   bark presenters; everything else to the existing dialog presenter.
3. Implement `oneShotOrdered` and `oneShotRandom` line selection for tagged
   passages, after confirming reset and repeat semantics with the comms team.
4. Read `proximityTrigger` from NPC data nodes. Fire the NPC's dialog when the
   player is within `triggerDistance`, and gate repeats on `retriggerDelay`
   when present.
5. Keep accepting NPC nodes with `data: {}` and passages with no new tags.
