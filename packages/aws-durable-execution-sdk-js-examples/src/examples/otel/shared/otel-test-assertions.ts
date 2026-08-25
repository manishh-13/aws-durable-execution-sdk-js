import type { SerializedSpan } from "./otel-test-setup";

export function assertInvocationViewTraceTopology(
  spans: SerializedSpan[],
): void {
  const workflowSpans = spans.filter((span) => span.name === "Workflow");
  expect(workflowSpans).toHaveLength(1);

  const workflowSpan = workflowSpans[0];
  // The whole execution shares one trace, anchored at the execution ancestor.
  // With no propagated context (local example runs), that ancestor is a
  // synthetic execution root, so the Workflow span parents onto it rather than
  // being a parentless root.
  expect(workflowSpan.parentSpanId).toBeDefined();
  expect(workflowSpan.traceId).toMatch(/^[0-9a-f]{32}$/);

  const invocationSpans = spans.filter((span) => span.name === "Invocation");
  expect(invocationSpans.length).toBeGreaterThan(0);

  // Every span — Workflow, Invocation, and the durable operation/attempt spans
  // — shares the single execution trace.
  expect(spans.every((span) => span.traceId === workflowSpan.traceId)).toBe(
    true,
  );

  const durableOperationSpans = spans.filter(
    (span) => span.attributes["durable.operation.type"] !== undefined,
  );
  expect(durableOperationSpans.length).toBeGreaterThan(0);
  for (const span of durableOperationSpans) {
    expect(span.links).toContainEqual({
      traceId: workflowSpan.traceId,
      spanId: workflowSpan.spanId,
    });
  }
}
