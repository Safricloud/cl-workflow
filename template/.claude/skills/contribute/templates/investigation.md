# Investigation — <topic> (<id>)

**Brief:** <the question, as asked by the orchestrator>
**Scope:** <paths>
**Checkout:** `<sha>`

## Answer

<Two to five sentences, plain English.>

## Facts

| Fact                                            | Value                                      | Where measured                     |
| ----------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| <library> version                               | <x.y.z>                                    | `node_modules/<lib>/package.json`  |
| <default for option>                            | <value>                                    | `node_modules/<lib>/<path>:<line>` |
| live count of <construct>                       | <n>                                        | `<the grep that counted it>`       |
| existing function the change needs / its copies | <name> at <file:line>; copy at <file:line> | `<the grep>`                       |

## Observations

<Patterns, traps, adjacent problems — each with evidence.>

## Not done / could not measure

## Live reads taken

<each labelled, with the response — or "none">
