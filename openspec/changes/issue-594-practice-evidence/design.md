# Design

A versioned package catalog owns profiles, measurement requirements and cumulative levels. Source observations retain exact repository, revision, workflow, run attempt, measured scope and producer identity. The evaluator accepts independently resolved source evidence and reports unknown authority as a gap; offline declarations cannot authenticate themselves. The initial GitHub adapter reads native run, job, test output and configured merge rules without writes.

Historical reports group compatible repository/scope/catalog definitions, select the latest attempt for each source run, reject contradictory duplicate identities and retain distribution, coverage, gaps, numeric trends and source links. They have no current-certification API and authorize no deletion.

Library exports and `lighthouse-sdlc practices` expose these reports. Existing evidence and delivery-stage APIs retain their own contracts. Mutation remains optional and never participates in level requirements.
