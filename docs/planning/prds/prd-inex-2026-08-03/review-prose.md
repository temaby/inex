# Prose Review: Transactions Page Enhancements PRD

| Original Text | Revised Text | Changes |
|---|---|---|
| `The previous-month comparison is clearly labelled and is not calculated from the currently paginated Ledger Rows.` | `The comparison with the preceding comparable period is clearly labelled and is not calculated from the currently paginated Ledger Rows.` | Aligns this requirement with custom ranges, which compare with a preceding equal-length range rather than the previous month. |
| `The active-filter indicator includes an immediately available Clear filters action.` | `The active-filter indicator includes an immediately available **Clear filters** action.` | Makes the named UI action visually and semantically distinct from the surrounding requirement text. |
| `Normal KPI copy may use a short conversion hint only when no Rate Warning is present.` | `A KPI may show a short conversion hint only when no Rate Warning is present.` | Replaces the undefined term “Normal KPI copy” with the UI element to which the rule applies. |
| `It does not announce every selection as a live region; after a successful save, the UI may announce a material selected-account balance change.` | `It does not announce every selection change through a live region; after a successful save, the UI may announce a material selected-account balance change.` | Clarifies that the restriction applies to announcements triggered by selection changes. |
| `The Transfer form retains distinct source/destination account and amount fields.` | `The Transfer form retains separate source-account and destination-account fields, plus its amount field.` | Removes the slash construction and makes clear that the form has two account fields. |
| `The server must reject an omitted/default transaction date.` | `The server must reject an omitted transaction date or a date with the language/runtime default value.` | Clarifies what “default” modifies while preserving the intended validation rule. |
