import { useCallback, useEffect, useState } from 'react';
import InfiniteMenu from './components/InfiniteMenu/InfiniteMenu';
import { fetchInfiniteMenuProducts } from './data/zionProducts';

export default function App() {
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
      <InfiniteMenu items={products} scale={3} />
    </main>
  );
}
