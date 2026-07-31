const ZION_GRAPHQL_ENDPOINT =
  'https://zion-app.functorz.com/zero/9G6nZlvVVym/api/graphql-v2';

const PRODUCT_QUERY = `
  query InfiniteMenuProducts {
    product_item(limit: 100) {
      id
      product_name
      product_summary
      detail_image {
        url
      }
      sort_order
      is_enabled
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

  const rows = payload.data?.product_item ?? payload.product_item ?? [];

  return rows
    .filter(row => row.is_enabled && row.detail_image?.url)
    .sort((left, right) => {
      const orderDifference = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
      return orderDifference || Number(left.id) - Number(right.id);
    })
    .map(row => ({
      id: row.id,
      image: row.detail_image.url,
      title: row.product_name || `产品 ${row.id}`,
      description: row.product_summary || '',
    }));
}
