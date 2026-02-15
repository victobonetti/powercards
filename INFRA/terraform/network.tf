resource "oci_core_vcn" "powercards_vcn" {
  cidr_block     = "10.0.0.0/16"
  compartment_id = var.compartment_ocid
  display_name   = "powercards-vcn"
  dns_label      = "powercards"
}

resource "oci_core_internet_gateway" "powercards_ig" {
  compartment_id = var.compartment_ocid
  display_name   = "powercards-internet-gateway"
  vcn_id         = oci_core_vcn.powercards_vcn.id
}

resource "oci_core_route_table" "powercards_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.powercards_vcn.id
  display_name   = "powercards-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.powercards_ig.id
  }
}

resource "oci_core_security_list" "powercards_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.powercards_vcn.id
  display_name   = "powercards-security-list"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      max = 22
      min = 22
    }
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      max = 80
      min = 80
    }
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      max = 443
      min = 443
    }
  }
  
  # Allow internal communication
  ingress_security_rules {
    protocol = "all"
    source   = "10.0.0.0/16"
  }
}

resource "oci_core_subnet" "powercards_subnet" {
  cidr_block        = "10.0.1.0/24"
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.powercards_vcn.id
  display_name      = "powercards-subnet"
  dns_label         = "sub01"
  security_list_ids = [oci_core_security_list.powercards_sl.id]
  route_table_id    = oci_core_route_table.powercards_rt.id
}
