import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { reverseGeocodeCoordinates } from "../services/reverseGeocodeService.js";

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
});

describe("Reverse geocoding", () => {
    it("returns address components needed to update checkout fields", async () => {
        global.fetch = async (url, options) => {
            assert.match(url, /format=jsonv2/);
            assert.equal(options.headers["Accept-Language"], "vi");
            return {
                ok: true,
                json: async () => ({
                    address: {
                        city: "Hà Nội",
                        county: "Huyện Sóc Sơn",
                        suburb: "Thị trấn Sóc Sơn",
                        house_number: "12A",
                        road: "Phố Núi",
                    },
                }),
            };
        };

        const address = await reverseGeocodeCoordinates({ latitude: 21.257, longitude: 105.848 });
        assert.deepEqual(address.provinceCandidates, ["Hà Nội"]);
        assert.deepEqual(address.districtCandidates, ["Huyện Sóc Sơn", "Thị trấn Sóc Sơn"]);
        assert.deepEqual(address.wardCandidates, ["Thị trấn Sóc Sơn"]);
        assert.equal(address.detail, "12A Phố Núi");
    });

    it("rejects coordinates outside the geographic range", async () => {
        await assert.rejects(
            reverseGeocodeCoordinates({ latitude: 95, longitude: 105 }),
            (error) => error.statusCode === 400
        );
    });
});