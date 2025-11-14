
import Button from '../../../components/base/Button';

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
                DreamPath와 함께
              </span>
              <br />
              <span className="text-gray-800">
                꿈을 현실로
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              DreamPath는 최첨단 AI 기술과 전문가의 노하우를 결합하여, 
              개인의 고유한 특성을 정확히 파악하고 최적의 진로를 제시하는 
              혁신적인 플랫폼입니다.
            </p>

            <div className="space-y-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-sm"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">개인 맞춤형 분석</h4>
                  <p className="text-gray-600">당신만의 고유한 성향과 가치관을 정확히 분석합니다</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-sm"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">실시간 채용 정보</h4>
                  <p className="text-gray-600">분석 결과와 매칭되는 최신 채용 정보를 실시간으로 제공합니다</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-sm"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">전문가 지원</h4>
                  <p className="text-gray-600">경험 많은 진로 전문가들이 당신의 성공을 함께 만들어갑니다</p>
                </div>
              </div>
            </div>

            <Button size="lg">
              <i className="ri-arrow-right-line mr-2"></i>
              자세히 알아보기
            </Button>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative z-10">
              <img 
                src="https://readdy.ai/api/search-image?query=Professional%20team%20working%20with%20AI%20technology%20for%20career%20development%2C%20diverse%20group%20of%20people%20collaborating%2C%20modern%20office%20environment%2C%20blue%20and%20purple%20lighting%2C%20inspiring%20teamwork%20atmosphere%2C%20futuristic%20career%20guidance%20concept&width=600&height=500&seq=about-team&orientation=landscape"
                alt="DreamPath Team"
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-2xl opacity-20"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-r from-[#8F5CFF] to-[#5A7BFF] rounded-full opacity-15"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
