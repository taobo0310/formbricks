import { buildCommonFilterQuery, pickCommonFilter } from "@/modules/api/v2/management/lib/utils";
import { TGetWebhooksFilter } from "@/modules/api/v2/management/webhooks/types/webhooks";
import { describe, expect, test, vi } from "vitest";
import { getWebhooksQuery } from "../utils";

vi.mock("@/modules/api/v2/management/lib/utils", () => ({
  pickCommonFilter: vi.fn(),
  buildCommonFilterQuery: vi.fn(),
}));

describe("getWebhooksQuery", () => {
  const environmentId = "env-123";

  test("adds surveyIds condition when provided", () => {
    const params = { surveyIds: ["survey1"] } as TGetWebhooksFilter;
    const result = getWebhooksQuery([environmentId], params);
    expect(result).toBeDefined();
    expect(result?.where).toMatchObject({
      environmentId: { in: [environmentId] },
      surveyIds: { hasSome: ["survey1"] },
    });
  });

  test("calls pickCommonFilter and buildCommonFilterQuery when baseFilter is present", () => {
    vi.mocked(pickCommonFilter).mockReturnValue({ someFilter: "test" } as any);
    getWebhooksQuery([environmentId], { surveyIds: ["survey1"] } as TGetWebhooksFilter);
    expect(pickCommonFilter).toHaveBeenCalled();
    expect(buildCommonFilterQuery).toHaveBeenCalled();
  });

  test("buildCommonFilterQuery is not called if no baseFilter is picked", () => {
    vi.mocked(pickCommonFilter).mockReturnValue(undefined as any);
    getWebhooksQuery([environmentId], {} as any);
    expect(buildCommonFilterQuery).not.toHaveBeenCalled();
  });
});
