import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getVietnamDistricts, getVietnamProvinces, getVietnamWards } from "../services/vietnamLocationService.js";

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
});

describe("Vietnam location directory", () => {
    it("normalizes province data for the checkout selectors", async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => [{ code: 1, name: "Thành phố Hà Nội" }],
        });

        assert.deepEqual(await getVietnamProvinces(), [
            { ProvinceID: 1, ProvinceName: "Thành phố Hà Nội" },
        ]);
    });

    it("loads only districts belonging to the selected province", async () => {
        let requestedUrl = "";
        global.fetch = async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                json: async () => ({ districts: [{ code: 2, name: "Quận Hoàn Kiếm" }] }),
            };
        };

        assert.deepEqual(await getVietnamDistricts(1), [
            { DistrictID: 2, DistrictName: "Quận Hoàn Kiếm" },
        ]);
        assert.match(requestedUrl, /\/p\/1\?depth=2$/);
    });

    it("loads wards for the selected district", async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ wards: [{ code: 4, name: "Phường Trúc Bạch" }] }),
        });

        assert.deepEqual(await getVietnamWards(1), [
            { WardCode: "4", WardName: "Phường Trúc Bạch" },
        ]);
    });
});