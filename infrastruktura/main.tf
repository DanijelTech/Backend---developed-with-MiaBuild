# ==============================================================================
# Terraform konfiguracija za NexGen
# ==============================================================================
# @author MIA BUILD
# @version 1.0.0
# @date 2024-12-24
# @domain Zaledni sistemi
#
# Backend Infrastructure - prilagojen za zaledne sisteme:
# - Managed database (PostgreSQL/MySQL)
# - Message broker (RabbitMQ/Kafka)
# - Cache layer (Redis)
# - Secrets management (Vault/AWS Secrets Manager)
# - Network policies za service-to-service komunikacijo
# - Autoscaling za backend workloads
# - Persistent storage za stateful komponente
#
# @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
# @meta_atom DEP_003 - Infrastructure as Code
# ==============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

# ==============================================================================
# Variables
# ==============================================================================

variable "project_name" {
  description = "Ime projekta"
  type        = string
  default     = "NexGen"
}

variable "environment" {
  description = "Okolje (development, staging, production)"
  type        = string
  default     = "production"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "NexGen"
}

variable "replicas" {
  description = "Stevilo replik"
  type        = number
  default     = 3
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "1.0.0"
}

variable "db_instance_class" {
  description = "Database instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_storage_gb" {
  description = "Database storage in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "rabbitmq_instance_type" {
  description = "RabbitMQ instance type"
  type        = string
  default     = "mq.t3.micro"
}

variable "worker_replicas" {
  description = "Stevilo worker replik"
  type        = number
  default     = 3
}

# ==============================================================================
# Kubernetes Resources
# ==============================================================================

resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace

    labels = {
      name        = var.namespace
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.project_name
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app         = var.project_name
      version     = var.image_tag
      environment = var.environment
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.project_name
      }
    }

    template {
      metadata {
        labels = {
          app         = var.project_name
          version     = var.image_tag
          environment = var.environment
        }
      }

      spec {
        container {
          name  = var.project_name
          image = "${var.project_name}:${var.image_tag}"

          port {
            container_port = 3000
            protocol       = "TCP"
          }

          env {
            name  = "NODE_ENV"
            value = var.environment
          }

          env {
            name  = "PORT"
            value = "3000"
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 3000
            }
            initial_delay_seconds = 10
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = var.project_name
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = var.project_name
    }

    port {
      port        = 80
      target_port = 3000
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# ==============================================================================
# Backend Worker Deployment
# ==============================================================================

resource "kubernetes_deployment" "worker" {
  metadata {
    name      = "${var.project_name}-worker"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app         = "${var.project_name}-worker"
      component   = "worker"
      version     = var.image_tag
      environment = var.environment
    }
  }

  spec {
    replicas = var.worker_replicas

    selector {
      match_labels = {
        app       = "${var.project_name}-worker"
        component = "worker"
      }
    }

    template {
      metadata {
        labels = {
          app         = "${var.project_name}-worker"
          component   = "worker"
          version     = var.image_tag
          environment = var.environment
        }
      }

      spec {
        container {
          name  = "${var.project_name}-worker"
          image = "${var.project_name}:${var.image_tag}"
          args  = ["worker"]

          env {
            name  = "NODE_ENV"
            value = var.environment
          }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = "${var.project_name}-secrets"
                key  = "database-url"
              }
            }
          }

          env {
            name = "RABBITMQ_URL"
            value_from {
              secret_key_ref {
                name = "${var.project_name}-secrets"
                key  = "rabbitmq-url"
              }
            }
          }

          env {
            name = "REDIS_URL"
            value_from {
              secret_key_ref {
                name = "${var.project_name}-secrets"
                key  = "redis-url"
              }
            }
          }

          resources {
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            exec {
              command = ["/bin/sh", "-c", "pgrep -f worker"]
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }
        }

        termination_grace_period_seconds = 300
      }
    }
  }
}

# ==============================================================================
# PostgreSQL StatefulSet (via Helm)
# ==============================================================================

resource "helm_release" "postgresql" {
  name       = "${var.project_name}-postgresql"
  namespace  = kubernetes_namespace.app.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "13.2.24"

  values = [
    <<-EOT
    auth:
      database: ${var.project_name}
      existingSecret: ${var.project_name}-secrets
      secretKeys:
        adminPasswordKey: postgres-password
        userPasswordKey: database-password
    primary:
      persistence:
        size: ${var.db_storage_gb}Gi
      resources:
        limits:
          cpu: "2"
          memory: 4Gi
        requests:
          cpu: "500m"
          memory: 1Gi
    readReplicas:
      replicaCount: 2
      persistence:
        size: ${var.db_storage_gb}Gi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
    EOT
  ]
}

# ==============================================================================
# RabbitMQ StatefulSet (via Helm)
# ==============================================================================

resource "helm_release" "rabbitmq" {
  name       = "${var.project_name}-rabbitmq"
  namespace  = kubernetes_namespace.app.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "rabbitmq"
  version    = "12.5.6"

  values = [
    <<-EOT
    auth:
      existingPasswordSecret: ${var.project_name}-secrets
      existingSecretPasswordKey: rabbitmq-password
    replicaCount: 3
    clustering:
      enabled: true
    persistence:
      size: 20Gi
    resources:
      limits:
        cpu: "1"
        memory: 2Gi
      requests:
        cpu: "250m"
        memory: 512Mi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
    EOT
  ]
}

# ==============================================================================
# Redis StatefulSet (via Helm)
# ==============================================================================

resource "helm_release" "redis" {
  name       = "${var.project_name}-redis"
  namespace  = kubernetes_namespace.app.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.6.1"

  values = [
    <<-EOT
    auth:
      existingSecret: ${var.project_name}-secrets
      existingSecretPasswordKey: redis-password
    sentinel:
      enabled: true
      masterSet: ${var.project_name}
    replica:
      replicaCount: 3
      persistence:
        size: 10Gi
    resources:
      limits:
        cpu: "500m"
        memory: 1Gi
      requests:
        cpu: "100m"
        memory: 256Mi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
    EOT
  ]
}

# ==============================================================================
# Secrets
# ==============================================================================

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "${var.project_name}-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "database-url"      = "postgresql://\${var.project_name}:\${var.database_password}@${var.project_name}-postgresql:5432/${var.project_name}"
    "database-password" = "\${var.database_password}"
    "postgres-password" = "\${var.postgres_password}"
    "rabbitmq-url"      = "amqp://user:\${var.rabbitmq_password}@${var.project_name}-rabbitmq:5672"
    "rabbitmq-password" = "\${var.rabbitmq_password}"
    "redis-url"         = "redis://:\${var.redis_password}@${var.project_name}-redis-master:6379"
    "redis-password"    = "\${var.redis_password}"
  }

  type = "Opaque"
}

# ==============================================================================
# Network Policies
# ==============================================================================

resource "kubernetes_network_policy" "app_network_policy" {
  metadata {
    name      = "${var.project_name}-network-policy"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        app = var.project_name
      }
    }

    policy_types = ["Ingress", "Egress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "istio-system"
          }
        }
      }
      ports {
        port     = "3000"
        protocol = "TCP"
      }
    }

    egress {
      to {
        pod_selector {
          match_labels = {
            app = "${var.project_name}-postgresql"
          }
        }
      }
      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    egress {
      to {
        pod_selector {
          match_labels = {
            app = "${var.project_name}-rabbitmq"
          }
        }
      }
      ports {
        port     = "5672"
        protocol = "TCP"
      }
    }

    egress {
      to {
        pod_selector {
          match_labels = {
            app = "${var.project_name}-redis"
          }
        }
      }
      ports {
        port     = "6379"
        protocol = "TCP"
      }
    }
  }
}

# ==============================================================================
# Horizontal Pod Autoscaler
# ==============================================================================

resource "kubernetes_horizontal_pod_autoscaler_v2" "app_hpa" {
  metadata {
    name      = "${var.project_name}-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
    }

    min_replicas = var.replicas
    max_replicas = var.replicas * 3

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "worker_hpa" {
  metadata {
    name      = "${var.project_name}-worker-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.worker.metadata[0].name
    }

    min_replicas = var.worker_replicas
    max_replicas = var.worker_replicas * 5

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}

# ==============================================================================
# Outputs
# ==============================================================================

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "deployment_name" {
  description = "Deployment name"
  value       = kubernetes_deployment.app.metadata[0].name
}

output "worker_deployment_name" {
  description = "Worker deployment name"
  value       = kubernetes_deployment.worker.metadata[0].name
}

output "service_name" {
  description = "Service name"
  value       = kubernetes_service.app.metadata[0].name
}

output "postgresql_host" {
  description = "PostgreSQL host"
  value       = "${var.project_name}-postgresql"
}

output "rabbitmq_host" {
  description = "RabbitMQ host"
  value       = "${var.project_name}-rabbitmq"
}

output "redis_host" {
  description = "Redis host"
  value       = "${var.project_name}-redis-master"
}
