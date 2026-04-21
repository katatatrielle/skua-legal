import { NextRequest } from "next/server";
import { proxy_provider_config_request } from "../../_lib/platform";

type RouteContext = {
  params: Promise<{
    configId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { configId } = await context.params;
  return proxy_provider_config_request(request, configId);
}
