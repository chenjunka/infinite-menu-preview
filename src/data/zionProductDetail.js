const ZION_GRAPHQL_ENDPOINT =
  'https://zion-app.functorz.com/zero/z7Bx4AP5z6J/api/graphql-v2';

const PRODUCT_DETAIL_QUERY = `
  query ProductDetail($id: bigint!) {
    product_by_pk(id: $id) {
      id
      product_name
      product_image { url }
      model_file { url }
      appearance_variants(order_by: { sort_order: asc }) {
        id
        appearance_name
        preview_image { url }
        sort_order
        is_default
        material_configs(order_by: { sort_order: asc }) {
          id
          material_name
          base_color_hex
          base_color_map { url }
          normal_map { url }
          roughness_map { url }
          metalness_map { url }
          roughness
          metalness
          normal_scale
          texture_mode
          sort_order
        }
      }
    }
  }
`;

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMaterialConfig(row) {
  return {
    id: row.id,
    materialName: row.material_name,
    baseColorHex: row.base_color_hex,
    baseColorMapUrl: row.base_color_map?.url ?? null,
    normalMapUrl: row.normal_map?.url ?? null,
    roughnessMapUrl: row.roughness_map?.url ?? null,
    metalnessMapUrl: row.metalness_map?.url ?? null,
    roughness: numberOr(row.roughness, 0.55),
    metalness: numberOr(row.metalness, 0),
    normalScale: numberOr(row.normal_scale, 1),
    textureMode: row.texture_mode || '纯色',
    sortOrder: numberOr(row.sort_order, 0),
  };
}

function toAppearance(row) {
  const materialConfigs = (row.material_configs || []).map(toMaterialConfig);
  const bodyConfig = materialConfigs.find(config => config.materialName === 'body');
  return {
    id: row.id,
    appearanceName: row.appearance_name,
    previewImageUrl: row.preview_image?.url ?? null,
    baseColorHex: bodyConfig?.baseColorHex ?? null,
    materialConfigs,
    sortOrder: numberOr(row.sort_order, 0),
    isDefault: Boolean(row.is_default),
  };
}

export async function fetchProductDetail(productId, signal) {
  const response = await fetch(ZION_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: PRODUCT_DETAIL_QUERY,
      variables: { id: productId },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`产品详情请求失败（${response.status}）`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || 'Zion 返回查询错误');
  }

  const row = payload.data?.product_by_pk;
  if (!row) return null;

  return {
    id: row.id,
    productName: row.product_name,
    productImageUrl: row.product_image?.url ?? null,
    modelFileUrl: row.model_file?.url ?? null,
    appearances: (row.appearance_variants || []).map(toAppearance),
  };
}
