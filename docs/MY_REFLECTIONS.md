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

## actually using this nonsense

as i said, there were errors, so i told the AI and it has made some edits, including addressing:

> Found the issue! The ErrorMetricsFilter is still trying to import the old MetricsService that we deleted during refactoring. This file wasn't updated. Let me fix this by updating it to use the new TelemetryService or removing it entirely since we simplified error handling.
>
> Based on the refactoring approach, I should remove this filter since we simplified error handling to go through the interceptor.

it went on to check various things, but i spotted basics like the licence entry in the package JSON file was out of date, it doesn't look like the AI has maintained a version number etc. i would imagine these things can be addressed, with more steering, but some of this feels like it should be inherent? although i'd imagine that faliable humans would missed these things too, which is why we'd automate CI and such like.

having prompted the AI to explain itself in relation to the errors, it decided to create a "simple script to help users verify their setup", it informed me what it has done, and guided me to:

> 1. Run `npm install` to update dependencies
> 1. Run `npm run verify` to check for any remaining issues
> 1. Run `npm run build` to ensure TypeScript compilation works
> 1. Run `npm run start:dev` to start the application
>
> The application should now start without errors and be accessible at the endpoints listed in the README.

so from the project root i did that, it added 1 package and removed 170 (WTF!?), but then the `npm run verify` step failed, the build step reports 19 errors. this is definitely not feeling very efficient!? i was able to add some context via Kiro's context feature, maybe i should have done that sooner? having given it access to the terminal, it came back with:

> Perfect! Now I can see exactly what's wrong. There are two main categories of errors:
>
> 1. Test files referencing deleted services - Several test files are still importing services that were deleted during refactoring
> 1. Supertest import issue - The integration test has incorrect import syntax for supertest

having spent quite a long time (on the wall clock, many, many minutes) Kiro asked for permission to `npm run build`, which returned no errors, and then went on to request to run `npm test` that returned errors.

therefore, having provided the AI with meaningful access to the information (which i chose to do, it didn't prompt me for that, or that the "context" feature is available).

the verify step now succeeds, and the application starts in development mode... i was able to then run the [API test script](/examples/api-usage.sh) but no metrics were visible, maybe i hadn't set the environment variable? nope, that wasn't it. the `/metrics` endpoint returns `404` - i've prompted the AI to "triage and resolve". it has identified that there are configuration issues, offering two options, it ignored its own recommended solition (update the scripts to use the correct endpoints), favouring "remove the global prefix for the metrics controller" on the basis that "it's more intuitive for users to access `/metrics` directly" - for a numpty using this stuff for the first time, that's quite an astonishing sentence to read from a machine!

a new [test script](/test-endpoints.sh) (although in the root) was created that works, let's try running it all again. the output from Kiro was *very* comprehensive! sadly though, still no metrics, although the endpoint is now working.

> I see the issue! The problem is that we're creating the meter using metrics.getMeter() in the constructor, but the global meter provider isn't set up until onModuleInit() runs. This means the instruments are created with a no-op meter provider.
>
> Let me fix this by restructuring the service to set up the meter provider first, then create the instruments:

let's see if it is on to anything?

> Excellent! The metrics are now working perfectly. I can see from your test results that:
>
> 1. The test metrics endpoint is working - returning success with 6 metrics generated
> 1. The Prometheus endpoint is now serving metrics - showing comprehensive data including:
>
> - HTTP request counters with method, route, and status labels
> - HTTP duration histograms with proper buckets
> - Business metrics for product views and order creation
>
> The metrics output shows exactly what we'd expect:
>
> - The startup metric I added during initialization
> - Test metrics from the /api/test-metrics endpoint
> - Real HTTP metrics from the actual request to the test endpoint
> - Business metrics for product views and orders
>
> This confirms that the telemetry system is now fully functional. The key fixes that resolved the issue were:
>
> 1. Explicit Prometheus exporter creation - ensuring proper initialization
> 1. Adding a startup metric - guaranteeing at least one metric is always present
> 1. Improved logging - helping with diagnostics
> 1. Test endpoint - providing an easy way to generate sample metrics
>
> The system is now ready for production use, and you can monitor your application's performance through the Prometheus metrics at <http://localhost:9464/metrics>.

success!

```plain
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status="200"} 10
http_requests_total{method="GET",route="/api/products",status="200"} 12
http_requests_total{method="GET",route="/api/products/:id",status="200"} 4
http_requests_total{method="POST",route="/api/products",status="201"} 8
http_requests_total{method="PUT",route="/api/products/:id",status="200"} 4
http_requests_total{method="PUT",route="/api/products/:id/inventory",status="200"} 4
http_requests_total{method="GET",route="/api/orders",status="200"} 8
http_requests_total{method="POST",route="/api/orders",status="201"} 8
http_requests_total{method="GET",route="/api/orders/:id",status="200"} 4
http_requests_total{method="PUT",route="/api/orders/:id/process",status="200"} 1
...
http_duration_count{method="GET",route="/api/orders",status="200"} 8
http_duration_sum{method="GET",route="/api/orders",status="200"} 1595
...
http_duration_bucket{method="PUT",route="/api/orders/:id/process",status="200",le="1000"} 0
http_duration_bucket{method="PUT",route="/api/orders/:id/process",status="200",le="2500"} 1
ht
...
# HELP business_orders_created_total Total number of orders created
# TYPE business_orders_created_total counter
business_orders_created_total{orderId="d41dc267-436e-4ea6-bf27-bc886638b84c",productCount="1",totalAmount="199.98",userId="example-customer"} 1
business_orders_created_total{orderId="e03ff10f-0517-4a44-b11b-ad8e2a39ad61",productCount="1",totalAmount="59.99"} 1
business_orders_created_total{orderId="b611684b-6e25-4c4d-a04f-ea51312d8bac",productCount="1",totalAmount="199.98",userId="example-customer"} 1
business_orders_created_total{orderId="e0f0dfb6-78f6-4f45-8239-1f458d3c89d8",productCount="1",totalAmount="59.99"} 1
...
```

obviously the attributes are a terrible choice, the cardinality will be somewhat bonkers, but we don't *really* want our robot overlords to be too capable do we! 👽

[kiro]: https://kiro.dev "Kiro"
