'use client';

import React, { useState, useRef, useEffect, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiDownload, FiRefreshCw, FiUpload, FiRotateCw, FiRotateCcw, FiSave, FiArrowLeft } from 'react-icons/fi';
import { TbFlipVertical, TbFlipHorizontal } from 'react-icons/tb';

interface FilterState {
  brightness: number;
  saturation: number;
  inversion: number;
  grayscale: number;
  blur: number;
  contrast: number;
  sepia: number;
  hueRotate: number;
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  saturation: 100,
  inversion: 0,
  grayscale: 0,
  blur: 0,
  contrast: 100,
  sepia: 0,
  hueRotate: 0,
};

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const initialImageUrl = searchParams.get('imageUrl');

  const [image, setImage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [rotate, setRotate] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(1);
  const [flipVertical, setFlipVertical] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(!!initialImageUrl);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageUrl) {
      setIsLoadingImage(true);
      fetch(initialImageUrl)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setImage(url);
          setIsLoadingImage(false);
        })
        .catch(err => {
          console.error("Failed to load initial image safely:", err);
          // Fallback, but canvas extraction might fail due to CORS
          setImage(initialImageUrl);
          setIsLoadingImage(false);
        });
    }
  }, [initialImageUrl]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      resetFilters();
    };
    reader.readAsDataURL(file);
  };

  const updateFilter = (filter: keyof FilterState, value: number) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setRotate(0);
    setFlipHorizontal(1);
    setFlipVertical(1);
  };

  const drawToCanvas = (): HTMLCanvasElement | null => {
    if (!imageRef.current || !canvasRef.current || !image) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isRotated = rotate === 90 || rotate === -90 || rotate === 270 || rotate === -270;
    canvas.width = isRotated ? imageRef.current.naturalHeight : imageRef.current.naturalWidth;
    canvas.height = isRotated ? imageRef.current.naturalWidth : imageRef.current.naturalHeight;

    ctx.filter = `brightness(${filters.brightness}%) saturate(${filters.saturation}%) invert(${filters.inversion}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px) contrast(${filters.contrast}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipHorizontal, flipVertical);
    
    ctx.drawImage(
      imageRef.current,
      -imageRef.current.naturalWidth / 2,
      -imageRef.current.naturalHeight / 2,
      imageRef.current.naturalWidth,
      imageRef.current.naturalHeight
    );

    return canvas;
  };

  const handleDownload = () => {
    const canvas = drawToCanvas();
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      link.download = 'edited-image.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      alert("Lỗi bảo mật CORS: Không thể tải xuống hình ảnh được nhúng từ tên miền khác. Hãy thử tải ảnh lên từ máy tính.");
    }
  };

  const handleUpdateProduct = () => {
    if (!productId) return;
    const canvas = drawToCanvas();
    if (!canvas) return;

    setIsUpdating(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUpdating(false);
          alert('Lỗi khi tạo ảnh (blob).');
          return;
        }

        const file = new File([blob], 'product-update.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'product');
        formData.append('resourceId', productId);

        try {
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!uploadRes.ok) throw new Error('Upload ảnh thất bại.');
          const uploadData = await uploadRes.json();
          
          const updateRes = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: uploadData.url })
          });
          
          if (updateRes.ok) {
            router.push('/admin/products');
          } else {
            throw new Error('Cập nhật database thất bại.');
          }
        } catch (err) {
          console.error(err);
          alert('Có lỗi xảy ra khi cập nhật ảnh cho sản phẩm.');
        } finally {
          setIsUpdating(false);
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      setIsUpdating(false);
      alert("Lỗi bảo mật CORS: Hình ảnh gốc từ nguồn bên ngoài không cho phép sửa đổi. Hãy thử tải ảnh trực tiếp từ máy của bạn.");
    }
  };

  const filterStyle = {
    filter: `brightness(${filters.brightness}%) saturate(${filters.saturation}%) invert(${filters.inversion}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px) contrast(${filters.contrast}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`,
    transform: `rotate(${rotate}deg) scale(${flipHorizontal}, ${flipVertical})`
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {productId && (
            <button 
              onClick={() => router.back()}
              className="p-2 bg-[#0E1726] hover:bg-[#15243B] text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Trình sửa ảnh nâng cao</h1>
            <p className="text-sm text-slate-400 mt-1">Chỉnh sửa, lọc và tùy biến hình ảnh trực tiếp trên trình duyệt</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#15243B] hover:bg-[#1C2F4D] text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <FiUpload className="w-4 h-4" />
            Tải ảnh khác lên
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          {image && !productId && (
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all"
            >
              <FiDownload className="w-4 h-4" />
              Tải ảnh về
            </button>
          )}
          {image && productId && (
            <button 
              onClick={handleUpdateProduct}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
              {isUpdating ? 'Đang cập nhật...' : 'Cập nhật sản phẩm'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px]">
        <div className="w-full lg:w-[340px] flex flex-col gap-6 bg-[#070D18] border border-[#152033] rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#152033] pb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <span className="text-emerald-400">⚡</span> Bộ lọc & Tùy chỉnh
            </h2>
            <button 
              onClick={resetFilters}
              disabled={!image}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw className="w-3 h-3" /> Đặt lại
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Xoay & Lật</label>
              <div className="grid grid-cols-4 gap-2">
                <button disabled={!image} onClick={() => setRotate(prev => prev - 90)} className="h-10 flex items-center justify-center bg-[#0E1726] hover:bg-[#15243B] text-slate-300 rounded-lg border border-[#1C2B42] transition-colors disabled:opacity-50"><FiRotateCcw className="w-4 h-4" /></button>
                <button disabled={!image} onClick={() => setRotate(prev => prev + 90)} className="h-10 flex items-center justify-center bg-[#0E1726] hover:bg-[#15243B] text-slate-300 rounded-lg border border-[#1C2B42] transition-colors disabled:opacity-50"><FiRotateCw className="w-4 h-4" /></button>
                <button disabled={!image} onClick={() => setFlipHorizontal(prev => prev === 1 ? -1 : 1)} className={`h-10 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${flipHorizontal === -1 ? 'bg-[#15243B] text-emerald-400 border-emerald-500/30' : 'bg-[#0E1726] hover:bg-[#15243B] text-slate-300 border-[#1C2B42]'}`}><TbFlipHorizontal className="w-5 h-5" /></button>
                <button disabled={!image} onClick={() => setFlipVertical(prev => prev === 1 ? -1 : 1)} className={`h-10 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${flipVertical === -1 ? 'bg-[#15243B] text-emerald-400 border-emerald-500/30' : 'bg-[#0E1726] hover:bg-[#15243B] text-slate-300 border-[#1C2B42]'}`}><TbFlipVertical className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="w-full h-[1px] bg-[#152033]" />
            <FilterSlider label="Độ sáng (Brightness)" value={filters.brightness} max={200} onChange={(val) => updateFilter('brightness', val)} disabled={!image} />
            <FilterSlider label="Độ tương phản (Contrast)" value={filters.contrast} max={200} onChange={(val) => updateFilter('contrast', val)} disabled={!image} />
            <FilterSlider label="Độ bão hòa (Saturation)" value={filters.saturation} max={200} onChange={(val) => updateFilter('saturation', val)} disabled={!image} />
            <FilterSlider label="Độ mờ (Blur)" value={filters.blur} max={20} step={0.5} unit="px" onChange={(val) => updateFilter('blur', val)} disabled={!image} />
            <FilterSlider label="Tách màu (Sepia)" value={filters.sepia} max={100} onChange={(val) => updateFilter('sepia', val)} disabled={!image} />
            <FilterSlider label="Trắng đen (Grayscale)" value={filters.grayscale} max={100} onChange={(val) => updateFilter('grayscale', val)} disabled={!image} />
            <FilterSlider label="Đảo ngược (Invert)" value={filters.inversion} max={100} onChange={(val) => updateFilter('inversion', val)} disabled={!image} />
            <FilterSlider label="Xoay màu (Hue)" value={filters.hueRotate} max={360} unit="°" onChange={(val) => updateFilter('hueRotate', val)} disabled={!image} />
          </div>
        </div>

        <div className="flex-1 bg-[#070D18] border border-[#152033] rounded-2xl flex items-center justify-center p-6 relative overflow-hidden shadow-inner group">
          {isLoadingImage ? (
             <div className="text-center flex flex-col items-center">
               <FiRefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
               <p className="text-slate-400 font-medium">Đang tải ảnh sản phẩm...</p>
             </div>
          ) : !image ? (
            <div className="text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-[#0E1726] border border-dashed border-[#1C2B42] rounded-full flex items-center justify-center text-[#1C2B42] mb-4">
                <FiUpload className="w-8 h-8" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có hình ảnh nào được chọn</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Chọn ảnh từ máy tính
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img 
                ref={imageRef}
                src={image} 
                crossOrigin="anonymous"
                alt="Original" 
                className="hidden"
              />
              <img 
                src={image} 
                crossOrigin="anonymous"
                alt="Preview" 
                style={filterStyle}
                className="max-w-full max-h-full object-contain transition-transform duration-200 shadow-2xl" 
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSlider({ 
  label, value, onChange, min = 0, max = 100, step = 1, unit = "%", disabled = false
}: { 
  label: string, value: number, onChange: (val: number) => void, min?: number, max?: number, step?: number, unit?: string, disabled?: boolean 
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className={`text-xs font-medium ${disabled ? 'text-slate-500' : 'text-slate-300'}`}>{label}</label>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded bg-[#0E1726] border ${disabled ? 'text-slate-600 border-[#152033]' : 'text-emerald-400 border-[#1C2B42]'}`}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 bg-[#152033] rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none accent-emerald-500"
      />
    </div>
  );
}

export default function ImageEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Đang tải công cụ sửa ảnh...</div>}>
      <EditorContent />
    </Suspense>
  );
}
