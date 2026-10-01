const getGhnApiUrl = () => (process.env.GHN_API_URL || "https://online-gateway.ghn.vn/shiip/public-api").replace(/\/$/, "");

export const isGhnConfigured = () => Boolean(process.env.GHN_TOKEN && process.env.GHN_SHOP_ID);

const getGhnHeaders = () => {
    if (!isGhnConfigured()) {
        const error = new Error("GHN chưa được cấu hình. Vui lòng thiết lập GHN_TOKEN và GHN_SHOP_ID.");
        error.statusCode = 503;
        throw error;
    }

    return {
        "Content-Type": "application/json",
        Token: process.env.GHN_TOKEN,
        ShopId: process.env.GHN_SHOP_ID,
    };
};

const requestGhn = async (path, { method = "GET", body } = {}) => {
    const response = await fetch(`${getGhnApiUrl()}${path}`, {
        method,
        headers: getGhnHeaders(),
        signal: AbortSignal.timeout(10000),
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();

    if (!response.ok || payload.code !== 200) {
        const error = new Error(payload.message || "GHN không thể xử lý yêu cầu báo giá.");
        error.statusCode = response.status >= 400 ? 502 : 400;
        throw error;
    }

    return payload.data;
};

export const getGhnProvinces = () => requestGhn("/master-data/province");

export const getGhnDistricts = (provinceId) => requestGhn(
    `/master-data/district?province_id=${encodeURIComponent(provinceId)}`
);

export const getGhnWards = (districtId) => requestGhn(
    `/master-data/ward?district_id=${encodeURIComponent(districtId)}`
);

export const quoteGhnFee = async ({ fromDistrictId, fromWardCode, toDistrictId, toWardCode, weight }) => {
    const fee = await requestGhn("/v2/shipping-order/fee", {
        method: "POST",
        body: {
            service_type_id: Number(process.env.GHN_SERVICE_TYPE_ID || 2),
            from_district_id: Number(fromDistrictId),
            from_ward_code: String(fromWardCode),
            to_district_id: Number(toDistrictId),
            to_ward_code: String(toWardCode),
            weight: Number(weight || process.env.GHN_DEFAULT_WEIGHT_GRAMS || 1000),
            length: Number(process.env.GHN_DEFAULT_LENGTH_CM || 20),
            width: Number(process.env.GHN_DEFAULT_WIDTH_CM || 15),
            height: Number(process.env.GHN_DEFAULT_HEIGHT_CM || 10),
            insurance_value: 0,
        },
    });

    const total = Number(fee?.total);
    if (!Number.isFinite(total) || total < 0) {
        const error = new Error("GHN trả về cước vận chuyển không hợp lệ.");
        error.statusCode = 502;
        throw error;
    }

    return total;
};