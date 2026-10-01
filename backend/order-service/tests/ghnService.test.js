import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getGhnDistricts, isGhnConfigured, quoteGhnFee } from "../services/ghnService.js";

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

describe("GHN shipping service", () => {
    it("reports disabled until both backend credentials are configured", () => {
        delete process.env.GHN_TOKEN;
        process.env.GHN_SHOP_ID = "shop-1";
        assert.equal(isGhnConfigured(), false);
    });

    it("sends GHN quote fields with credentials and returns the authoritative fee", async () => {
        process.env.GHN_TOKEN = "test-token";
        process.env.GHN_SHOP_ID = "12345";
        let request;
        global.fetch = async (url, options) => {
            request = { url, ...options, body: JSON.parse(options.body) };
            return { ok: true, json: async () => ({ code: 200, data: { total: 32000 } }) };
        };

        const fee = await quoteGhnFee({
            fromDistrictId: 1454,
            fromWardCode: "21211",
            toDistrictId: 1442,
            toWardCode: "20308",
            weight: 1200,
        });

        assert.equal(fee, 32000);
        assert.match(request.url, /\/v2\/shipping-order\/fee$/);
        assert.equal(request.headers.Token, "test-token");
        assert.equal(request.headers.ShopId, "12345");
        assert.equal(request.body.from_district_id, 1454);
        assert.equal(request.body.to_ward_code, "20308");
        assert.equal(request.body.weight, 1200);
    });

    it("uses GHN district master data endpoint with the selected province", async () => {
        process.env.GHN_TOKEN = "test-token";
        process.env.GHN_SHOP_ID = "12345";
        let requestedUrl = "";
        global.fetch = async (url) => {
            requestedUrl = url;
            return { ok: true, json: async () => ({ code: 200, data: [] }) };
        };

        await getGhnDistricts(202);
        assert.match(requestedUrl, /district\?province_id=202$/);
    });
});