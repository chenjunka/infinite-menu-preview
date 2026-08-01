import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function removeDecal(scene, materialName) {
  const decal = scene.getObjectByName(`front-decal-${materialName}`);
  if (!decal) return;
  decal.parent?.remove(decal);
  decal.geometry.dispose();
  decal.material.map?.dispose();
  decal.material.dispose();
}

function applyFrontDecal(scene, model, config, isCurrent) {
  if (!config.baseColorMapUrl) return;
  const textureLoader = new THREE.TextureLoader();
  textureLoader.loadAsync(config.baseColorMapUrl).then(texture => {
    if (!isCurrent()) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    const body = model.getObjectByName('body-surface');
    if (!(body instanceof THREE.Mesh)) {
      texture.dispose();
      return;
    }
    model.updateMatrixWorld(true);
    const decal = new THREE.Mesh(
      new DecalGeometry(
        body,
        new THREE.Vector3(0, 2.36, 0.75),
        new THREE.Euler(0, 0, 0),
        new THREE.Vector3(1.1, 1.1, 0.25),
      ),
      new THREE.MeshBasicMaterial({ map: texture, polygonOffset: true, polygonOffsetFactor: -4 }),
    );
    decal.name = `front-decal-${config.materialName}`;
    scene.add(decal);
  }).catch(error => console.warn('[产品 3D] 贴花加载失败', error));
}

function applyMaterialConfig(scene, model, config, isCurrent) {
  const textureLoader = new THREE.TextureLoader();
  removeDecal(scene, config.materialName);

  const applyTexture = (url, apply) => {
    if (!url) return;
    textureLoader.loadAsync(url).then(texture => {
      if (!isCurrent()) {
        texture.dispose();
        return;
      }
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material.name === config.materialName && material instanceof THREE.MeshStandardMaterial) {
            apply(material, texture);
            material.needsUpdate = true;
          }
        });
      });
    }).catch(error => console.warn('[产品 3D] 材质贴图加载失败', error));
  };

  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      if (material.name !== config.materialName || !(material instanceof THREE.MeshStandardMaterial)) return;
      material.map = null;
      material.normalMap = null;
      material.roughnessMap = null;
      material.metalnessMap = null;
      material.color.set(config.textureMode === '整体UV贴图' ? '#ffffff' : (config.baseColorHex || '#ffffff'));
      material.roughness = config.roughness;
      material.metalness = config.metalness;
      material.needsUpdate = true;
    });
  });

  if (config.textureMode === '正面贴花') {
    applyFrontDecal(scene, model, config, isCurrent);
  } else {
    applyTexture(config.baseColorMapUrl, (material, texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
    });
  }
  applyTexture(config.normalMapUrl, (material, texture) => {
    material.normalMap = texture;
    material.normalScale.set(config.normalScale, config.normalScale);
  });
  applyTexture(config.roughnessMapUrl, (material, texture) => {
    material.roughnessMap = texture;
  });
  applyTexture(config.metalnessMapUrl, (material, texture) => {
    material.metalnessMap = texture;
  });
}

function applyAppearance(scene, model, appearance, isCurrent) {
  appearance?.materialConfigs.forEach(config => applyMaterialConfig(scene, model, config, isCurrent));
}

export default function ProductViewer({ modelUrl, appearance }) {
  const mountRef = useRef(null);
  const viewerRef = useRef(null);
  const appearanceRef = useRef(appearance);
  const appearanceRequestRef = useRef(0);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return undefined;

    let cancelled = false;
    let animationFrame = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe7e8e3);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2d3430, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xcfe0ff, 1.25);
    fillLight.position.set(-6, 3, -5);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.25;
    controls.minDistance = 5;
    controls.maxDistance = 18;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const animate = () => {
      if (cancelled) return;
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    setStatus('loading');
    new GLTFLoader().loadAsync(modelUrl).then(gltf => {
      if (cancelled) return;
      const model = gltf.scene;
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.frustumCulled = false;
        object.visible = true;
      });

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 5.3 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.y -= scaledBox.min.y;
      const target = new THREE.Vector3(0, 2.7, 0);
      const radius = 13.5;
      camera.position.set(0, 3.15, radius);
      controls.target.copy(target);
      controls.update();
      scene.add(model);
      scene.updateMatrixWorld(true);
      viewerRef.current = { scene, model, controls, camera, target, radius };
      const requestId = ++appearanceRequestRef.current;
      applyAppearance(scene, model, appearanceRef.current, () => appearanceRequestRef.current === requestId);
      setStatus('ready');
    }).catch(error => {
      console.error('[产品 3D] 模型加载失败', error);
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      appearanceRequestRef.current += 1;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material?.dispose());
      });
      renderer.dispose();
      viewerRef.current = null;
      mount.replaceChildren();
    };
  }, [modelUrl]);

  useEffect(() => {
    appearanceRef.current = appearance;
    const viewer = viewerRef.current;
    if (!viewer || !appearance) return;
    const requestId = ++appearanceRequestRef.current;
    applyAppearance(viewer.scene, viewer.model, appearance, () => appearanceRequestRef.current === requestId);
  }, [appearance]);

  const resetView = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.position.set(0, 3.15, viewer.radius);
    viewer.controls.target.copy(viewer.target);
    viewer.controls.update();
  };

  return (
    <div className="viewer-shell" data-ready={status === 'ready'}>
      <div className="viewer-canvas" ref={mountRef} />
      <button className="viewer-reset" type="button" onClick={resetView} title="重置视角" aria-label="重置视角">
        <RotateCcw size={18} strokeWidth={1.8} />
      </button>
      {status === 'loading' && <div className="viewer-status">正在加载模型</div>}
      {status === 'error' && <div className="viewer-status">模型暂时无法显示</div>}
    </div>
  );
}
