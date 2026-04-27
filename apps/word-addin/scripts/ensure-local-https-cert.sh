#!/usr/bin/env sh
set -eu

cert_dir="${SKUA_WORD_CERT_DIR:-certificates}"
key_file="${cert_dir}/localhost-key.pem"
cert_file="${cert_dir}/localhost.pem"

if [ -f "${key_file}" ] && [ -f "${cert_file}" ]; then
  exit 0
fi

mkdir -p "${cert_dir}"

openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 825 \
  -nodes \
  -keyout "${key_file}" \
  -out "${cert_file}" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
