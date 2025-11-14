
export default function FeaturesSection() {
  const features = [
    {
      icon: 'ri-brain-line',
      title: 'AI 성향 분석',
      description: '대화형 AI가 당신의 성향, 감정, 가치관을 깊이 있게 분석하여 맞춤형 진로를 제시합니다.',
      image: 'https://readdy.ai/api/search-image?query=AI%20brain%20analysis%20interface%20with%20neural%20networks%2C%20personality%20assessment%20visualization%2C%20blue%20and%20purple%20gradient%20colors%2C%20modern%20digital%20interface%2C%20clean%20minimalist%20design%2C%20futuristic%20technology%20concept&width=400&height=300&seq=ai-analysis&orientation=landscape'
    },
    {
      icon: 'ri-briefcase-line',
      title: '맞춤 직업 추천',
      description: '분석 결과를 바탕으로 당신에게 가장 적합한 직업과 실시간 채용 정보를 추천해드립니다.',
      image: 'https://readdy.ai/api/search-image?query=Professional%20career%20recommendation%20dashboard%20with%20job%20listings%2C%20modern%20UI%20design%2C%20blue%20and%20purple%20accents%2C%20clean%20interface%20showing%20various%20career%20paths%2C%20inspiring%20workplace%20imagery&width=400&height=300&seq=job-recommend&orientation=landscape'
    },
    {
      icon: 'ri-video-chat-line',
      title: '전문가 화상 상담',
      description: '필요시 경험 많은 진로 전문가와 1:1 화상 상담을 통해 더 구체적인 조언을 받을 수 있습니다.',
      image: 'https://readdy.ai/api/search-image?query=Professional%20video%20consultation%20session%2C%20career%20counselor%20and%20client%20on%20video%20call%2C%20modern%20office%20setting%2C%20warm%20and%20supportive%20atmosphere%2C%20blue%20and%20purple%20lighting%2C%20professional%20consultation%20concept&width=400&height=300&seq=video-consult&orientation=landscape'
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
              핵심 기능
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI 기술과 전문가의 경험이 결합된 혁신적인 진로 탐색 서비스를 경험해보세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#5A7BFF]/30">
              <div className="mb-6">
                <img 
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="w-16 h-16 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <i className={`${feature.icon} text-2xl text-white`}></i>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-[#5A7BFF] transition-colors duration-300">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
