import { NextRequest } from "next/server";
import { proxy_provider_config_request } from "../_lib/platform";

export async function GET(request: NextRequest) {
  return proxy_provider_config_request(request);
}

export async function POST(request: NextRequest) {
  return proxy_provider_config_request(request);
}
