# PowerCards Deployment Plan - Oracle Cloud Free Tier

This plan outlines the architecture and steps to deploy the PowerCards application to Oracle Cloud Infrastructure (OCI) using the Always Free Tier.

## Architecture

We will utilize the **ARM Ampere A1 Compute** instances available in the Free Tier, which offer up to 4 OCPUs and 24 GB of RAM. This provides significant power for Java, AI, and Database workloads.

### Split Strategy
To optimize for performance and separation of concerns, we will split the infrastructure into two VMs:

1.  **VM 1: Application Node (2 OCPUs, 12 GB RAM)**
    *   **Role**: Serves user traffic and application logic.
    *   **Components**:
        *   **Traefik**: Reverse Proxy & Load Balancer (handles SSL/TLS automatically).
        *   **Frontend**: React App served via Nginx container.
        *   **Backend**: Quarkus API.
        *   **Keycloak**: Identity and Access Management.
    *   **OS**: Oracle Linux 8/9 (ARM) or Ubuntu (ARM).

2.  **VM 2: Data & AI Node (2 OCPUs, 12 GB RAM)**
    *   **Role**: Handles persistent data and heavy AI computation.
    *   **Components**:
        *   **PostgreSQL**: Primary Database.
        *   **MinIO**: Object Storage.
        *   **Ollama**: AI Model Inference (CPU optimized).
    *   **OS**: Oracle Linux 8/9 (ARM) or Ubuntu (ARM).

### Networking
*   **VCN**: A single Virtual Cloud Network.
*   **Public Subnet**: Hosting both VMs (simplified for Free Tier, secured via Security Lists/Firewalls).
*   **Security Lists**:
    *   Allow Ingress 80/443 to VM 1.
    *   Allow Ingress 22 (SSH) to both (restricted to specific IPs if possible).
    *   Allow Internal Traffic (Quarkus -> DB/Ollama/MinIO) between VM 1 and VM 2 on specific ports.

## CI/CD Pipeline (GitHub Actions)

We will implement a robust CI/CD pipeline using GitHub Actions and GitHub Container Registry (GHCR).

1.  **Build & Publish Workflows**:
    *   **Backend**: Builds Quarkus JAR -> Validates -> Builds Docker Image -> Pushes to GHCR.
    *   **Frontend**: Builds React App -> Builds Nginx Docker Image -> Pushes to GHCR.
    *   **Support Services**: Builds custom images for Ollama/Keycloak if config changes -> Pushes to GHCR.

2.  **Deployment Workflow**:
    *   **Trigger**: Push to `main` branch (after successful builds) or Manual Dispatch.
    *   **Tool**: **Ansible**.
    *   **Process**:
        1.  SSH into VM 1 and VM 2.
        2.  Update `docker-compose.yml` with new image tags.
        3.  `docker compose up -d --remove-orphans`.
        4.  Prune old images.

## Automation & Infrastructure as Code (IaC)

### Terraform (`INFRA/terraform`)
*   Provision VCN, Subnets, Gateway.
*   Provision 2 Compute Instances (Ampere).
*   Output Public IPs.

### Ansible (`INFRA/ansible`)
*   **Playbook 1: Setup**:
    *   Install Docker, Docker Compose, Git.
    *   Configure Firewall (iptables/ufw).
    *   Create directories.
*   **Playbook 2: Deploy**:
    *   Copy `docker-compose` files.
    *   Authenticate with GHCR.
    *   Pull and Restart containers.

## Implementation Steps

1.  [ ] **Containerization**: Ensure all components have Dockerfiles (Frontend needs one).
2.  [ ] **Terraform**: Write scripts to provision OCI resources.
3.  [ ] **Ansible**: Write playbooks for server setup and deployment.
4.  [ ] **GitHub Actions**: Create workflows for building and deploying.
5.  [ ] **Documentation**: Instructions on how to run locally and deploy.
