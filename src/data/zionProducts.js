const ZION_GRAPHQL_ENDPOINT =
  'https://zion-app.functorz.com/zero/z7Bx4AP5z6J/api/graphql-v2';

const PRODUCT_QUERY = `
  query InfiniteMenuProducts {
    product(limit: 100) {
      id
      product_name
      product_image {
        url
      }
    }
  }
`;

export async function fetchInfiniteMenuProducts(signal) {
  const response = await fetch(ZION_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: PRODUCT_QUERY, variables: {} }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Zion request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || 'Zion returned a GraphQL error');
  }

  const rows = payload.data?.product ?? payload.product ?? [];

  return rows
    .filter(row => row.product_image?.url)
    .sort((left, right) => Number(left.id) - Number(right.id))
    .map(row => ({
      id: row.id,
      image: row.product_image.url,
      title: row.product_name || `产品 ${row.id}`,
      description: `${row.product_name || `产品 ${row.id}`} 3D 详情`,
    }));
}
