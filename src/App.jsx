import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import InfiniteMenu from './components/InfiniteMenu/InfiniteMenu';
import { fetchInfiniteMenuProducts } from './data/zionProducts';

const ProductDetail = lazy(() => import('./components/ProductDetail/ProductDetail'));

function readProductId() {
  const value = Number(new URLSearchParams(window.location.search).get('productId'));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function navigateToProduct(productId) {
  const url = new URL(window.location.href);
  if (productId === null) url.searchParams.delete('productId');
  else url.searchParams.set('productId', String(productId));
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function MenuPage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setStatus('loading');
    fetchInfiniteMenuProducts(controller.signal)
      .then(items => {
        setProducts(items);
        setStatus(items.length ? 'ready' : 'empty');
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [requestVersion]);

  const retry = useCallback(() => {
    setRequestVersion(version => version + 1);
  }, []);

  if (status !== 'ready') {
    return (
      <main className="status-screen" aria-live="polite">
        {status === 'loading' && <div className="loading-indicator" aria-label="正在加载产品" />}
        {status === 'empty' && <p>暂无可展示产品</p>}
        {status === 'error' && (
          <div className="error-state">
            <p>产品数据加载失败</p>
            <button type="button" onClick={retry}>重新加载</button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="menu-screen">
      <InfiniteMenu
        items={products}
        scale={3}
        onItemClick={item => item && navigateToProduct(item.id)}
      />
    </main>
  );
}

export default function App() {
  const [productId, setProductId] = useState(readProductId);

  useEffect(() => {
    const updateRoute = () => setProductId(readProductId());
    window.addEventListener('popstate', updateRoute);
    return () => window.removeEventListener('popstate', updateRoute);
  }, []);

  if (productId !== null) {
    return (
      <Suspense fallback={<main className="status-screen">正在打开产品详情</main>}>
        <ProductDetail productId={productId} onBack={() => navigateToProduct(null)} />
      </Suspense>
    );
  }

  return <MenuPage />;
}
