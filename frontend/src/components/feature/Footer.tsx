
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="https://static.readdy.ai/image/b6e15883c9875312b01889a8e71bf8cf/ccfcaec324d8c4883819f9f330e8ceab.png" 
                alt="DreamPath Logo" 
                className="h-10 w-10"
              />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
                DreamPath
              </h3>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              AI 기술과 전문가의 경험이 결합된 혁신적인 진로 탐색 서비스로 
              당신의 꿈을 현실로 만들어보세요.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                <i className="ri-facebook-fill text-white"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                <i className="ri-twitter-fill text-white"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                <i className="ri-instagram-fill text-white"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                <i className="ri-linkedin-fill text-white"></i>
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">서비스</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">AI 성향 분석</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">직업 추천</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">화상 상담</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">채용 정보</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-lg font-semibold mb-4">회사</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">회사 소개</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">팀</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">연락처</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">채용</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 DreamPath. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">개인정보처리방침</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">이용약관</a>
            <a href="https://readdy.ai/?origin=logo" className="text-gray-400 hover:text-white text-sm transition-colors">Powered by Readdy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
