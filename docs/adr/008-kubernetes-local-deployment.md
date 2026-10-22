# Kubernetes for a local deployment

## Context

Compose shows the processes. A manifest set shows probes, requests, and limits in the shape a cluster would use.

## Decision

k8s/ holds a namespace, a ConfigMap, the API, Qdrant, and an ingress for a local host. Liveness is /health. Readiness is /ready. The generation key is a Secret reference with no value in git. The target is kind, minikube, or k3d on one machine.

## Alternatives considered

A managed Kubernetes service would leave the zero-cost constraint. Skipping manifests would leave the operational shape only in Compose.

## Consequences

The manifests are a local demonstration. They do not add authentication, a shared rate limiter, or a statement that the system is production-ready. An ingress controller is not included.
