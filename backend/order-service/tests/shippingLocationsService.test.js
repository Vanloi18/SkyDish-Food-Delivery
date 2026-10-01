import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getShippingLocationsService } from "../services/orderService.js";

const originalFetch = global.fetch;
const originalToken = process.env.GHN_TOKEN;
const originalShopId = process.env.GHN_SHOP_ID;

afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GHN_TOKEN;
    else process.env.GHN_TOKEN = originalToken;
    if (originalShopId === undefined) delete process.env.GHN_SHOP_ID;
    else process.env.GHN_SHOP_ID = originalShopId;
});

describe("Shipping location source selection", () => {
    it("provides cascading public locations without GHN credentials", async () => {
        delete process.env.GHN_TOKEN;
        delete process.env.GHN_SHOP_ID;
        let requestedUrl = "";
        global.fetch = async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                json: async () => ({ districts: [{ code: 2, name: "Quận Hoàn Kiếm" }] }),
            };
        };

        const result = await getShippingLocationsService({ type: "districts", parentId: 1 });
        assert.equal(result.provider, "VN_PUBLIC");
        assert.deepEqual(result.data, [{ DistrictID: 2, DistrictName: "Quận Hoàn Kiếm" }]);
        assert.match(requestedUrl, /\/p\/1\?depth=2$/);
    });

    it("does not use public location IDs for GHN restaurant origins", async () => {
        delete process.env.GHN_TOKEN;
        delete process.env.GHN_SHOP_ID;

        await assert.rejects(
            getShippingLocationsService({ type: "provinces", provider: "GHN" }),
            (error) => error.statusCode === 503
        );
    });
});