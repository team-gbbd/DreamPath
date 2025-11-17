import Button from "../../../components/base/Button";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#5A7BFF]/10 to-[#8F5CFF]/10"></div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-[#8F5CFF] to-[#5A7BFF] rounded-full opacity-30 animate-bounce"></div>
      <div className="absolute bottom-32 left-20 w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full opacity-25"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
              AI가 찾아주는
            </span>
            <br />
            <span className="text-gray-800">나만의 꿈의 길</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            성향, 감정, 가치관을 대화형으로 분석하여 적합한 직업과 채용 정보를
            추천하고, <br />
            전문가와의 화상 상담까지 연결해주는 통합형 진로·취업 플랫폼
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button size="lg" className="min-w-48">
              <i className="ri-rocket-line mr-2"></i>
              무료로 시작하기
            </Button>
            <Button variant="primary" size="lg" className="min-w-48">
              <i className="ri-play-circle-line mr-2"></i>
              서비스 둘러보기
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent mb-2">
                10,000+
              </div>
              <div className="text-gray-600">성공적인 진로 매칭</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-gray-600">전문 상담사</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent mb-2">
                98%
              </div>
              <div className="text-gray-600">만족도</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1/2 h-full opacity-30 hidden lg:block">
        <img
          src="https://readdy.ai/api/search-image?query=Modern%20professional%20woman%20using%20AI%20technology%20for%20career%20guidance%2C%20futuristic%20interface%20with%20holographic%20career%20paths%2C%20soft%20blue%20and%20purple%20lighting%2C%20minimalist%20background%2C%20digital%20innovation%20concept%2C%20clean%20and%20inspiring%20atmosphere&width=800&height=1000&seq=hero-dreampath&orientation=portrait"
          alt="AI Career Guidance"
          className="w-full h-full object-cover object-top"
        />
      </div>
    </section>
  );
}
