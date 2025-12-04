import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import { useToast } from '@/components/common/Toast';
import axios from 'axios';

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  updated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export default function FaqManagementPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    answer: ''
  });
  const [filterCategory, setFilterCategory] = useState<string>('전체');
  const [validationError, setValidationError] = useState<string>('');

  const categories = [
    '전체',
    '계정 / 로그인 관련',
    '프로필 / 사용자 정보',
    '진로 추천 / 분석 관련',
    'AI 문의 챗봇 관련',
    '기술적 문제',
    '기타 문의'
  ];

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/faq/all`);
      setFaqs(response.data);
    } catch (err: any) {
      console.error('FAQ 로딩 실패:', err);
      setError('FAQ 데이터를 불러오는 중 오류가 발생했습니다.');
      showToast('FAQ 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({ category: '', question: '', answer: '' });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/faq/${id}`);
      if (response.data.success) {
        showToast('FAQ가 삭제되었습니다.', 'success');
        fetchFaqs();
      } else {
        showToast(response.data.message || '삭제 실패', 'error');
      }
    } catch (err: any) {
      console.error('FAQ 삭제 실패:', err);
      showToast('FAQ 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.category) {
      setValidationError('카테고리를 선택해주세요.');
      return;
    }
    if (!formData.question.trim()) {
      setValidationError('질문을 입력해주세요.');
      return;
    }
    if (!formData.answer.trim()) {
      setValidationError('답변을 입력해주세요.');
      return;
    }

    setValidationError('');

    try {
      if (editingFaq) {
        // 수정
        const response = await axios.put(`${API_BASE_URL}/api/faq/${editingFaq.id}`, formData);
        if (response.data.success) {
          showToast('FAQ가 수정되었습니다.', 'success');
          setIsModalOpen(false);
          fetchFaqs();
        } else {
          showToast(response.data.message || '수정 실패', 'error');
        }
      } else {
        // 생성
        const response = await axios.post(`${API_BASE_URL}/api/faq`, formData);
        if (response.data.success) {
          showToast('FAQ가 생성되었습니다.', 'success');
          setIsModalOpen(false);
          fetchFaqs();
        } else {
          showToast(response.data.message || '생성 실패', 'error');
        }
      }
    } catch (err: any) {
      console.error('FAQ 저장 실패:', err);
      showToast('FAQ 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const filteredFaqs = filterCategory === '전체'
    ? faqs
    : faqs.filter(faq => faq.category === filterCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchFaqs}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center">
                <i className="ri-question-answer-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">FAQ 관리</h1>
                <p className="text-gray-600">자주 묻는 질문 관리 시스템</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <i className="ri-arrow-left-line"></i>
                대시보드로
              </button>
              <button
                onClick={handleCreate}
                className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <i className="ri-add-line"></i>
                FAQ 추가
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                  <i className="ri-file-list-line text-2xl text-pink-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">{faqs.length}</p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterCategory === cat
                      ? 'bg-pink-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className="bg-white rounded-xl shadow-md border-2 border-pink-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="ri-list-check text-pink-500 mr-3"></i>
              FAQ 목록 ({filteredFaqs.length}개)
            </h2>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">FAQ가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-pink-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className="inline-block bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium mb-2">
                          {faq.category}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(faq)}
                          className="w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all flex items-center justify-center"
                          title="수정"
                        >
                          <i className="ri-edit-line text-lg"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all flex items-center justify-center"
                          title="삭제"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      마지막 수정: {(() => {
                        // 시간대 정보가 없으면 'Z' 붙여서 UTC로 처리
                        const dateStr = faq.updated_at.endsWith('Z') ? faq.updated_at : faq.updated_at + 'Z';
                        const date = new Date(dateStr);
                        return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                      })()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingFaq ? 'FAQ 수정' : 'FAQ 추가'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                  <i className="ri-error-warning-line text-lg"></i>
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    setValidationError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">선택하세요</option>
                  {categories.filter(c => c !== '전체').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  질문 *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => {
                    setFormData({ ...formData, question: e.target.value });
                    setValidationError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="질문을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  답변 *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => {
                    setFormData({ ...formData, answer: e.target.value });
                    setValidationError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 h-32"
                  placeholder="답변을 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setValidationError('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
                >
                  {editingFaq ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
