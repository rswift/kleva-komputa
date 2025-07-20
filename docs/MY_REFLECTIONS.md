# the human take

first time using an LLM approach for anything, i went down the "spec" route with kiro...

actually quite impressed, and really like the steering feature, and the spec driven approach seems more grown up than "vibe coding", that to me, comes over as somewhat childish - the adage that planes that can fly themselves, need more experienced pilots than those that can't, feels like the same thing here?!

the tasks didn't execute as cleanly as i expected, things got out of step with task 3, it skipped ahead and then seemed to get out of sorts, that resulted in retries that caused me to be throttled by AWS... and there were two errors that the model didn't seem to spot, or address, but when prompted, did so.

i have NOT yet run this, it may not work, that wasn't my goal really, to build a working thing, rather, to explore the use and understand how to get to the point where something is being built.

## post-refactoring

although there are errors, for example, the [`architecture.md`](./diagrams/architecture.md) file doesn't render properly (probably easy to fix manually than more prompting) it has been a far better experience than i imagined! i, for one, welcome our robot overlords! 🦾 🤖

having asked for the refactor, its approach, and response was impressive... i still haven't tested it, as i've said, this has been about the interaction with the model, using [kiro][kiro], not a functional dollop of code.

the process of prompting doesn't seem very efficient, for me at least, but i can imagine that for someone who isn't keen to invest themselves in a topic, this wouldn't be a concern.

overall, would i use this more? tricky, having just followed the guidance in the initial [README](/README.md#getting-started) `npm run start:dev`, to see "Found 21 errors." in the terminal, does rather underscore that things are far from perfect... especially as the AI seems to have [suggested](/docs/KIRO_CONCLUSION.md#final-reflection) that it is all high quality... maybe i need to force it to test itself with vim and vigour?

i'll definitely revisit this, and maybe explore it in different ways in support of both the technical and non-technical usage of an AI agent.

🖖

[kiro]: https://kiro.dev "Kiro"
