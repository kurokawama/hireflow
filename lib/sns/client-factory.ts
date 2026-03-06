// Factory for creating platform-specific SNS clients
import type { SNSPlatform } from "@/types/sns";
import type { SNSClientConfig } from "./base-client";
import { MockSNSClient, type BaseSNSClient } from "./base-client";
import { XClient } from "./x-client";
import { MetaClient } from "./meta-client";
import { LINEClient } from "./line-client";

export function createSNSClient(
  platform: SNSPlatform,
  config: SNSClientConfig
): BaseSNSClient {
  switch (platform) {
    case "x":
      return new XClient(config);
    case "facebook":
      return new MetaClient("facebook", config);
    case "instagram":
      return new MetaClient("instagram", config);
    case "line":
      return new LINEClient(config);
    case "tiktok":
    case "youtube":
      // These platforms don't have posting APIs — always mock
      return new MockSNSClient(platform, config);
    default:
      return new MockSNSClient(platform, config);
  }
}
