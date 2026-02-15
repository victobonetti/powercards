variable "tenancy_ocid" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "private_key_path" {}
variable "region" {}
variable "compartment_ocid" {}
variable "ssh_public_key" {}

variable "instance_shape" {
  default = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  default = 2
}

variable "instance_memory_in_gbs" {
  default = 12
}

variable "image_ocid" {
  # Oracle Linux 8 aarch64 (Check for latest OCID in your region)
  # This is a placeholder, user needs to update this or use a data source
  default = "ocid1.image.oc1..unique_id_for_oracle_linux_8_arm" 
}
