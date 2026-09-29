'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import { FiStar, FiUser, FiMessageSquare } from 'react-icons/fi';
import SafeImage from '@/components/common/SafeImage';

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để đánh giá.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Có lỗi xảy ra.');
      }
      addToast('Đánh giá của bạn đã được ghi nhận 🎉');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (err: any) {
      addToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="text-3xl font-black text-amber-400">{avgRating} / 5</div>
        <div className="text-xs text-slate-400">Dựa trên {reviews.length} đánh giá đã được xác thực mua hàng.</div>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <FiMessageSquare className="text-orange-400" /> Viết đánh giá của bạn
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Đánh giá sao:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition ${star <= rating ? 'text-amber-400' : 'text-slate-600'}`}
                >
                  <FiStar className={star <= rating ? 'fill-current' : ''} size={20} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition"
            rows={3}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
          </button>
        </form>
      ) : (
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center text-sm text-slate-400">
          Vui lòng <a href={`/login`} className="text-orange-400 hover:underline">đăng nhập</a> để viết đánh giá.
        </div>
      )}

      <div className="space-y-4 mt-6">
        {loading ? (
          <div className="text-slate-400 text-sm text-center py-4">Đang tải đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên!</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
                {review.user?.avatar ? (
                  <SafeImage src={review.user.avatar} alt={review.user.name} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <FiUser size={20} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-white">{review.user?.name || 'Khách hàng'}</span>
                  <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-slate-600'} />
                  ))}
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-300 mt-2">{review.comment}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
