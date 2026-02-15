output "app_node_public_ip" {
  value = oci_core_instance.app_node.public_ip
}

output "data_node_public_ip" {
  value = oci_core_instance.data_node.public_ip
}
