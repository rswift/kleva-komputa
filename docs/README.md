# notes

other than the steering files (in [/.kiro/steering](/.kiro/steering/)), only two files in this repo were created by me, this document and [`MY_REFLECTIONS.md`](./MY_REFLECTIONS.md).

i set out to look at what [Kiro](https://kiro.dev "Kiro") could do, specifically exploring the spec driven approach - i've not been on board with the idea of having these tools simply generate stuff for me, so the idea that the tool created the requirements, that i then agreed (literally, i didn't change anything, that wasn't the goal here) was interesting.

whilst it hasn't been easy, and maybe what has been created is bobbins, the AI has done what was needed, in a way that seems far more aligned to a professional context than "vibing" (😒).

it is clear things aren't perfect, for example, i asked it to create a meme, which it seems to have done, but then the output cannot be seen

all the work was done with claude sonnet 3.7, because it told me 4.0 was too busy, so i requested:

> claude sonnet 4.0, review this repo, don't change anything, but document, in `/docs/SONNET_40.md` how you would implement these requirements differently from how 3.7 has, or improve things generally... you must be honest, even if that means 3.7 doesn't seem to have done a good job!

it seemed to have reviewed the repo, but then come back with:

> I can see you have the docs/README.md file open. To help you effectively, I need to understand what you'd like to work on.
>
> Looking at the context from our previous conversation, it seems we've been working on a NestJS OpenTelemetry POC implementation.
>
> Could you let me know:
>
> - Are you looking to create a new spec for a feature?
> - Do you want to update an existing spec?
> - Or are you looking to execute tasks from an existing spec?
>
> If you have a specific feature or improvement in mind, I can help you create or update the appropriate spec documents following the structured approach with requirements, design, and implementation tasks.

so i went back with:

> no, simply review the repo and in `/docs/SONNET_40.md`, document how you would implement these requirements differently from how 3.7 has, or improve things generally... you must be honest, even if that means 3.7 doesn't seem to have done a good job!

things seem to be struggling, but maybe that's because of an overload on this model? but it has done it, the file [/docs/SONNET_40.md](/docs/SONNET_40.md "Sonnet 4.0 ponderings on its predecessor"), was noted with:

> Now I have a comprehensive understanding of the implementation. Let me create the SONNET_40.md file with my honest assessment:
>
> Created `SONNET_40.md`
>
> I've completed my honest review of the NestJS OpenTelemetry POC implementation. Here's a summary of my assessment:
>
> Key Findings:
>
> What Claude 3 Opus did well:
>
> - Excellent documentation and rationale
> - Proper NestJS integration patterns
> - Comprehensive test coverage
> - Good environment-based configuration
>
> Critical issues I identified:
>
> 1. Massive over-engineering - Multiple unnecessary abstraction layers
> 1. Inconsistent error handling - Unpredictable behaviour patterns
> 1. Questionable abstractions - Interfaces that don't add value
> 1. Configuration complexity - Overkill for a POC
> 1. Premature optimisation - Features not needed for demonstration
>
> My recommended approach:
>
> - Single, simple telemetry service instead of multiple layers
> - Direct use of OpenTelemetry APIs rather than custom wrappers
> - Simplified configuration and error handling
> - Focus on demonstrating core concepts clearly
>
> The implementation is technically sound but suffers from the classic problem of over-engineering a proof of concept. While it shows deep understanding of the technologies, it obscures the core concepts behind unnecessary complexity. A POC should demonstrate ideas clearly and simply, not showcase every possible feature.
>
> The documentation quality is exemplary though, and the overall architecture follows good NestJS patterns - it's just too complex for its intended purpose.
