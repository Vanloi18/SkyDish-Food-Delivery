const ADDRESS_API_URL = "https://provinces.open-api.vn/api/v1";

const fetchLocationData = async (path) => {
    const response = await fetch(`${ADDRESS_API_URL}${path}`, {
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        const error = new Error("Không thể tải danh mục tỉnh/thành phố.");
        error.statusCode = 502;
        throw error;
    }
    return response.json();
};

export const getVietnamProvinces = async () => {
    const provinces = await fetchLocationData("/p/");
    return provinces.map((province) => ({
        ProvinceID: province.code,
        ProvinceName: province.name,
    }));
};

export const getVietnamDistricts = async (provinceId) => {
    const province = await fetchLocationData(`/p/${encodeURIComponent(provinceId)}?depth=2`);
    return (province.districts || []).map((district) => ({
        DistrictID: district.code,
        DistrictName: district.name,
    }));
};

export const getVietnamWards = async (districtId) => {
    const district = await fetchLocationData(`/d/${encodeURIComponent(districtId)}?depth=2`);
    return (district.wards || []).map((ward) => ({
        WardCode: String(ward.code),
        WardName: ward.name,
    }));
};