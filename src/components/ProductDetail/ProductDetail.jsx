import { ArrowLeft, ArrowUpRight, Box } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchProductDetail } from '../../data/zionProductDetail';
import ProductViewer from './ProductViewer';
import './ProductDetail.css';

function ProductImage({ product }) {
  if (product.productImageUrl) {
    return <img src={product.productImageUrl} alt={product.productName} />;
  }
  return <div className="detail-image-fallback"><Box size={28} /></div>;
}

function DetailContent({ product, onBack }) {
  const [selectedAppearanceId, setSelectedAppearanceId] = useState(() => (
    product.appearances.find(appearance => appearance.isDefault)?.id
      ?? product.appearances[0]?.id
      ?? null
  ));
  const selectedAppearance = useMemo(
    () => product.appearances.find(appearance => appearance.id === selectedAppearanceId),
    [product.appearances, selectedAppearanceId],
  );

  return (
    <main className="detail-screen">
      <div className="detail-page">
        <header className="detail-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} strokeWidth={1.8} />
            <span>产品菜单</span>
          </button>
          <span className="detail-id">产品 #{String(product.id).padStart(3, '0')}</span>
        </header>

        <section className="detail-layout">
          <div className="viewer-panel">
            {product.modelFileUrl
              ? <ProductViewer modelUrl={product.modelFileUrl} appearance={selectedAppearance} />
              : <div className="model-empty"><Box size={34} /><span>该产品暂无 3D 模型</span></div>}
          </div>
          <aside className="detail-sidebar">
            <div className="detail-title">
              <p className="detail-eyebrow">3D PRODUCT</p>
              <h1>{product.productName}</h1>
              <p>{product.modelFileUrl ? '拖动旋转，滚轮或双指缩放' : '模型资源尚未配置'}</p>
            </div>
            <div className="detail-product-image"><ProductImage product={product} /></div>
            <div className="appearance-section">
              <div className="appearance-label">
                <span>外观方案</span>
                <span>{product.appearances.length}</span>
              </div>
              {product.appearances.length > 0 ? (
                <div className="appearance-list">
                  {product.appearances.map(appearance => (
                    <button
                      className={`appearance-option ${appearance.id === selectedAppearanceId ? 'is-active' : ''}`}
                      type="button"
                      key={appearance.id}
                      onClick={() => setSelectedAppearanceId(appearance.id)}
                    >
                      <span className="appearance-swatch" style={{ backgroundColor: appearance.baseColorHex || '#b5b7b1' }} />
                      <span>{appearance.appearanceName}</span>
                      {appearance.id === selectedAppearanceId && <ArrowUpRight size={16} strokeWidth={1.8} />}
                    </button>
                  ))}
                </div>
              ) : <p className="appearance-empty">暂无外观方案</p>}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default function ProductDetail({ productId, onBack }) {
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setProduct(null);
    fetchProductDetail(productId, controller.signal)
      .then(data => {
        setProduct(data);
        setStatus(data ? 'ready' : 'missing');
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [productId]);

  if (status === 'ready' && product) return <DetailContent product={product} onBack={onBack} />;

  const message = {
    loading: '正在读取产品详情',
    missing: `未找到产品 #${productId}`,
    error: '产品详情暂时无法加载',
  }[status];

  return (
    <main className="detail-screen detail-state-screen">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} strokeWidth={1.8} />
        <span>返回产品菜单</span>
      </button>
      <p>{message}</p>
    </main>
  );
}
