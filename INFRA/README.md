# Infrastructure & Deployment Guide

## 1. Prerequisites
- **Oracle Cloud Account** (Free Tier is sufficient).
- **Terraform** installed locally.
- **Ansible** installed locally.
- **GitHub Account** for GHCR and Actions.

## 2. Infrastructure Provisioning (Terraform)
1.  Navigate to `INFRA/terraform`.
2.  Create a `terraform.tfvars` file with your OCI credentials:
    ```hcl
    tenancy_ocid     = "ocid1.tenancy.oc1..."
    user_ocid        = "ocid1.user.oc1..."
    fingerprint      = "xx:xx:xx..."
    private_key_path = "/path/to/oci_api_key.pem"
    region           = "us-ashburn-1"
    compartment_ocid = "ocid1.compartment.oc1..."
    ssh_public_key   = "ssh-rsa AAAAB3..."
    ```
3.  Run `terraform init`.
4.  Run `terraform apply`.
5.  Note the **App Node IP** and **Data Node IP** from the outputs.

## 3. Configuration Management (Ansible)
1.  Navigate to `INFRA/ansible`.
2.  Update `inventory` file with the IPs from Terraform.
3.  Run the setup playbook:
    ```bash
    ansible-playbook -i inventory setup.yml
    ```
4.  Run the deployment playbook:
    ```bash
    ansible-playbook -i inventory deploy.yml --extra-vars "github_actor=<YOUR_GITHUB_USER> github_token=<YOUR_GITHUB_TOKEN>"
    ```

## 4. CI/CD (GitHub Actions)
1.  Add the following **Secrets** to your GitHub Repository:
    - `SSH_PRIVATE_KEY`: Private key corresponding to the public key used in Terraform.
    - `ANSIBLE_INVENTORY`: The content of your `INFRA/ansible/inventory` file.
2.  Push changes to `main` to trigger the build and deploy.

## 5. Notes
- **App Node**: Hosts Frontend, Backend, Keycloak.
- **Data Node**: Hosts Postgres, MinIO, Ollama.
- **Split**: Logic is split to leverage the 24GB RAM limit (12GB per node).
