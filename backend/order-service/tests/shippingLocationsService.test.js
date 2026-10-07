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

    it("resolves a GHN district from a reverse-geocoded ward name", async () => {
        process.env.GHN_TOKEN = "test-token";
        process.env.GHN_SHOP_ID = "123";
        global.fetch = async (url) => {
            const requestUrl = new URL(url);
            if (requestUrl.pathname.endsWith("/district")) {
                return {
                    ok: true,
                    json: async () => ({
                        code: 200,
                        data: [
                            { DistrictID: 3440, DistrictName: "Quận Nam Từ Liêm" },
                            { DistrictID: 1482, DistrictName: "Quận Bắc Từ Liêm" },
                        ],
                    }),
                };
            }

            const districtId = requestUrl.searchParams.get("district_id");
            return {
                ok: true,
                json: async () => ({
                    code: 200,
                    data: districtId === "1482"
                        ? [{ WardCode: "11007", WardName: "Phường Phú Diễn", NameExtension: ["Phú Diễn"] }]
                        : [{ WardCode: "13001", WardName: "Phường Cầu Diễn" }],
                }),
            };
        };

        const result = await getShippingLocationsService({
            type: "resolve-area",
            parentId: 201,
            wardCandidates: ["Phú Diễn"],
        });

        assert.equal(result.data.district.DistrictID, 1482);
        assert.equal(result.data.ward.WardCode, "11007");
    });
});