
import { useState } from 'react';
import Button from '../../../components/base/Button';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
              문의하기
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            궁금한 점이 있으시거나 더 자세한 정보가 필요하시면 언제든 연락해주세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-2xl font-bold mb-8 text-gray-800">연락처 정보</h3>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
                  <i className="ri-mail-line text-white text-xl"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">이메일</h4>
                  <p className="text-gray-600">contact@dreampath.ai</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
                  <i className="ri-phone-line text-white text-xl"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">전화</h4>
                  <p className="text-gray-600">02-1234-5678</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
                  <i className="ri-map-pin-line text-white text-xl"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">주소</h4>
                  <p className="text-gray-600">서울특별시 강남구 테헤란로 123</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <img 
                src="https://readdy.ai/api/search-image?query=Modern%20office%20building%20with%20blue%20and%20purple%20lighting%2C%20professional%20business%20environment%2C%20clean%20architecture%2C%20inspiring%20workplace%20atmosphere%2C%20futuristic%20corporate%20headquarters%20concept&width=500&height=300&seq=contact-office&orientation=landscape"
                alt="DreamPath Office"
                className="w-full rounded-xl shadow-lg"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">메시지 보내기</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent transition-colors text-sm"
                  placeholder="이름을 입력해주세요"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent transition-colors text-sm"
                  placeholder="이메일을 입력해주세요"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  메시지
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent transition-colors text-sm resize-none"
                  placeholder="문의 내용을 입력해주세요 (최대 500자)"
                  required
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.message.length}/500
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full"
                disabled={formData.message.length > 500}
              >
                <i className="ri-send-plane-line mr-2"></i>
                메시지 보내기
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
