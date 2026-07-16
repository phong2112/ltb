import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ApplicationStatus,
  CvParseStatus,
  FileKind,
  JobStatus,
  PrismaClient,
} from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/hr_copilot?schema=public";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const jobs = [
  {
    title: "Senior Product Designer",
    slug: "senior-product-designer",
    company: "Bloom Creative Studio",
    department: "Design",
    locations: ["Hà Nội"],
    employment: "Full-time",
    level: "Senior",
    salaryRange: "2,500 – 4,000 USD",
    tags: ["UI/UX", "Figma", "Design System"],
    description:
      "Bloom Creative Studio đang tìm kiếm **Senior Product Designer** tài năng để dẫn dắt tầm nhìn thiết kế cho các sản phẩm flagship của chúng tôi.\n\nBạn sẽ làm việc trực tiếp với team Product và Engineering, định hướng toàn bộ visual language và interaction design cho 2 sản phẩm chủ lực.",
    requirements:
      "- Tối thiểu 5 năm kinh nghiệm Product Design\n- Portfolio thể hiện quá trình thiết kế end-to-end\n- Thành thạo Figma và các công cụ prototyping\n- Kỹ năng giao tiếp và làm việc nhóm xuất sắc\n- Kinh nghiệm xây dựng Design System là lợi thế",
    benefits:
      "- Lương cạnh tranh 2,500 – 4,000 USD\n- Laptop MacBook Pro M2\n- 15 ngày phép/năm\n- Remote 2 ngày/tuần\n- Budget học tập 5M/năm",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🌸",
  },
  {
    title: "Frontend Engineer (React)",
    slug: "frontend-engineer-react",
    company: "NovaTech Solutions",
    department: "Engineering",
    locations: ["TP Hồ Chí Minh"],
    employment: "Hybrid",
    level: "Mid-level",
    salaryRange: "1,800 – 3,000 USD",
    tags: ["React", "TypeScript", "Next.js"],
    description:
      "NovaTech tuyển **Frontend Engineer** để xây dựng ứng dụng web thế hệ mới, phục vụ hàng chục nghìn người dùng trên toàn khu vực.\n\nBạn sẽ là thành viên chủ chốt trong team Frontend 5 người, trực tiếp build các tính năng quan trọng trên nền React + Next.js.",
    requirements:
      "- 3+ năm kinh nghiệm React\n- Thành thạo TypeScript và Next.js\n- Có mắt thẩm mỹ và chú trọng chi tiết\n- Tiếng Anh giao tiếp được\n- Kinh nghiệm với TailwindCSS là lợi thế",
    benefits:
      "- Lương 1,800 – 3,000 USD\n- Hybrid 3 ngày office/tuần\n- Bảo hiểm sức khỏe cao cấp\n- Team building hàng quý\n- Stock option cho nhân viên kỳ cựu",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "💻",
  },
  {
    title: "Marketing Manager",
    slug: "marketing-manager",
    company: "Peach & Co.",
    department: "Marketing",
    locations: ["Đà Nẵng"],
    employment: "Full-time",
    level: "Manager",
    salaryRange: "1,500 – 2,500 USD",
    tags: ["Digital Marketing", "SEO", "Brand Strategy"],
    description:
      "Peach & Co. đang tìm kiếm **Marketing Manager** đam mê xây dựng câu chuyện thương hiệu và phát triển cộng đồng người dùng trung thành.\n\nBạn sẽ dẫn dắt team Marketing 4 người, xây dựng chiến lược tổng thể và thực thi các chiến dịch đa kênh.",
    requirements:
      "- 4+ năm kinh nghiệm marketing\n- Tư duy data-driven\n- Thành thạo Google Analytics, Meta Ads\n- Tiếng Anh và tiếng Việt lưu loát\n- Kinh nghiệm quản lý team",
    benefits:
      "- Lương 1,500 – 2,500 USD\n- KPI bonus hàng quý\n- Đà Nẵng — work-life balance tuyệt vời\n- Remote thứ 6 hàng tuần",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🍑",
  },
  {
    title: "TA Business Partner",
    slug: "hr-business-partner",
    company: "Rosé Ventures",
    department: "People",
    locations: ["Hà Nội"],
    employment: "Full-time",
    level: "Senior",
    salaryRange: "1,200 – 2,000 USD",
    tags: ["TA", "Recruitment", "People Ops"],
    description:
      "Rosé Ventures tuyển **TA Business Partner** để hỗ trợ phát triển đội ngũ và văn hóa tổ chức trên toàn Việt Nam.\n\nVị trí này đòi hỏi khả năng kết hợp giữa tư duy chiến lược và kỹ năng thực thi tốc độ cao trong môi trường startup đang scale.",
    requirements:
      "- 4+ năm kinh nghiệm TA\n- Nền tảng TABP hoặc TA Generalist\n- Kỹ năng lắng nghe và coaching xuất sắc\n- Am hiểu Luật Lao động Việt Nam\n- Kinh nghiệm trong môi trường startup là lợi thế",
    benefits:
      "- Lương 1,200 – 2,000 USD\n- Equity options\n- Flexible working hours\n- Văn phòng tại Hoàn Kiếm, Hà Nội",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🌹",
  },
  {
    title: "Data Analyst",
    slug: "data-analyst",
    company: "Sakura Analytics",
    department: "Data",
    locations: ["TP Hồ Chí Minh"],
    employment: "Remote",
    level: "Mid-level",
    salaryRange: "1,200 – 2,200 USD",
    tags: ["SQL", "Python", "Tableau"],
    description:
      "Sakura Analytics tuyển **Data Analyst** để biến dữ liệu phức tạp thành insight hành động cho khách hàng trên khắp Đông Nam Á.\n\nBạn sẽ làm việc với data từ nhiều ngành khác nhau, xây dựng dashboard và báo cáo phục vụ quyết định kinh doanh.",
    requirements:
      "- 2+ năm kinh nghiệm phân tích dữ liệu\n- Thành thạo SQL và Python (pandas)\n- Kinh nghiệm với BI tools (Tableau, Power BI)\n- Kỹ năng storytelling với dữ liệu\n- Tiếng Anh đọc viết tốt",
    benefits:
      "- Lương 1,200 – 2,200 USD\n- 100% Remote\n- Thiết bị làm việc hỗ trợ\n- Cộng đồng data analyst chuyên nghiệp",
    status: JobStatus.DRAFT,
    urgent: false,
    logo: "🌸",
  },
  {
    title: "Customer Success Manager",
    slug: "customer-success-manager",
    company: "Blossom SaaS",
    department: "Customer Success",
    locations: ["Hà Nội"],
    employment: "Hybrid",
    level: "Mid-level",
    salaryRange: "1,000 – 1,800 USD",
    tags: ["Customer Success", "SaaS", "Account Management"],
    description:
      "Blossom SaaS tuyển **Customer Success Manager** để giúp khách hàng khai thác tối đa giá trị từ nền tảng của chúng tôi.\n\nBạn là cầu nối quan trọng giữa khách hàng và sản phẩm — vai trò quyết định tỉ lệ retention và growth của công ty.",
    requirements:
      "- 2+ năm kinh nghiệm customer success\n- Ưu tiên kinh nghiệm SaaS B2B\n- Kỹ năng giao tiếp và xây dựng mối quan hệ xuất sắc\n- Tư duy giải quyết vấn đề\n- Tiếng Anh giao tiếp",
    benefits:
      "- Lương 1,000 – 1,800 USD\n- Commission theo retention rate\n- Hybrid linh hoạt\n- Đào tạo Customer Success chuyên sâu",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "🌷",
  },
  {
    title: "Backend Engineer (Node.js)",
    slug: "backend-engineer-nodejs",
    company: "LotusPay",
    department: "Engineering",
    locations: ["Hà Nội", "Remote"],
    employment: "Hybrid",
    level: "Senior",
    salaryRange: "2,000 – 3,500 USD",
    tags: ["Node.js", "NestJS", "PostgreSQL"],
    description:
      "LotusPay tuyển **Backend Engineer** để phát triển các dịch vụ thanh toán có độ tin cậy cao cho khách hàng SME.\n\nBạn sẽ thiết kế API, tối ưu PostgreSQL và phối hợp với team Product để đưa các tính năng tài chính ra production an toàn.",
    requirements:
      "- 4+ năm kinh nghiệm backend Node.js\n- Có kinh nghiệm NestJS hoặc framework tương đương\n- Hiểu transaction, locking và indexing trong PostgreSQL\n- Ưu tiên từng làm sản phẩm fintech hoặc payment",
    benefits:
      "- Lương 2,000 – 3,500 USD\n- Hybrid tại Hà Nội, có ngày remote\n- Bảo hiểm sức khỏe mở rộng\n- Review lương 2 lần/năm",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "💻",
  },
  {
    title: "QA Automation Engineer",
    slug: "qa-automation-engineer",
    company: "Orchid Labs",
    department: "Quality",
    locations: ["TP Hồ Chí Minh"],
    employment: "Full-time",
    level: "Mid-level",
    salaryRange: "1,200 – 2,000 USD",
    tags: ["Playwright", "API Testing", "Automation"],
    description:
      "Orchid Labs cần **QA Automation Engineer** để xây dựng test suite tự động cho nền tảng SaaS B2B.\n\nBạn sẽ làm việc sát với developer, viết test API/UI và theo dõi chất lượng release hàng tuần.",
    requirements:
      "- 2+ năm kinh nghiệm QA automation\n- Thành thạo Playwright, Cypress hoặc Selenium\n- Biết test API và đọc log backend\n- Có tư duy phân tích lỗi rõ ràng",
    benefits:
      "- Lương 1,200 – 2,000 USD\n- Budget học certification\n- MacBook hoặc laptop Windows tùy chọn\n- Quy trình release rõ ràng, ít overtime",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🌿",
  },
  {
    title: "Product Manager",
    slug: "product-manager",
    company: "Mango Commerce",
    department: "Product",
    locations: ["TP Hồ Chí Minh", "Hà Nội"],
    employment: "Hybrid",
    level: "Manager",
    salaryRange: "2,200 – 3,800 USD",
    tags: ["Product Strategy", "Roadmap", "Analytics"],
    description:
      "Mango Commerce tuyển **Product Manager** phụ trách growth funnel cho nền tảng thương mại điện tử.\n\nBạn sẽ sở hữu roadmap, làm việc với Engineering, Design, Sales và phân tích dữ liệu để ưu tiên cơ hội tăng trưởng.",
    requirements:
      "- 4+ năm kinh nghiệm product management\n- Từng quản lý roadmap sản phẩm web/mobile\n- Có khả năng phân tích funnel và viết PRD rõ ràng\n- Giao tiếp tốt với stakeholder đa phòng ban",
    benefits:
      "- Lương 2,200 – 3,800 USD\n- Bonus theo hiệu quả sản phẩm\n- Hybrid linh hoạt tại HCM/Hà Nội\n- Ngân sách research người dùng hàng quý",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "📊",
  },
  {
    title: "DevOps Engineer",
    slug: "devops-engineer",
    company: "CloudNest",
    department: "Platform",
    locations: ["Đà Nẵng", "Remote"],
    employment: "Remote",
    level: "Senior",
    salaryRange: "2,000 – 3,200 USD",
    tags: ["AWS", "Kubernetes", "Terraform"],
    description:
      "CloudNest tìm **DevOps Engineer** để vận hành hạ tầng cloud cho các hệ thống có traffic lớn.\n\nBạn sẽ chuẩn hóa CI/CD, IaC, observability và phối hợp incident response cùng engineering teams.",
    requirements:
      "- 4+ năm kinh nghiệm DevOps/SRE\n- Thành thạo AWS, Docker, Kubernetes\n- Có kinh nghiệm Terraform và CI/CD pipeline\n- Biết thiết kế monitoring, alerting và runbook",
    benefits:
      "- Remote-first\n- Lương 2,000 – 3,200 USD\n- Phụ cấp thiết bị làm việc tại nhà\n- On-call allowance rõ ràng",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "⭐",
  },
  {
    title: "Mobile Engineer (React Native)",
    slug: "mobile-engineer-react-native",
    company: "Lime Mobility",
    department: "Mobile",
    locations: ["Hà Nội"],
    employment: "Full-time",
    level: "Mid-level",
    salaryRange: "1,600 – 2,800 USD",
    tags: ["React Native", "Mobile", "TypeScript"],
    description:
      "Lime Mobility tuyển **Mobile Engineer** để phát triển ứng dụng vận hành đội xe và trải nghiệm người dùng cuối.\n\nBạn sẽ build tính năng mobile, tích hợp native module khi cần và tối ưu hiệu năng trên iOS/Android.",
    requirements:
      "- 3+ năm kinh nghiệm mobile development\n- 2+ năm với React Native\n- Nắm vững TypeScript và state management\n- Có kinh nghiệm release app lên App Store/Google Play",
    benefits:
      "- Lương 1,600 – 2,800 USD\n- Thiết bị test iOS/Android đầy đủ\n- Bảo hiểm sức khỏe\n- Team mobile có senior mentor",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "💻",
  },
  {
    title: "Talent Acquisition Specialist",
    slug: "talent-acquisition-specialist",
    company: "PeopleGarden",
    department: "Recruitment",
    locations: ["TP Hồ Chí Minh"],
    employment: "Full-time",
    level: "Junior",
    salaryRange: "700 – 1,200 USD",
    tags: ["Recruitment", "Sourcing", "Interview"],
    description:
      "PeopleGarden tuyển **Talent Acquisition Specialist** để hỗ trợ tuyển dụng các vị trí công nghệ và vận hành.\n\nBạn sẽ sourcing, screening, điều phối phỏng vấn và chăm sóc trải nghiệm ứng viên.",
    requirements:
      "- 1+ năm kinh nghiệm recruitment hoặc TA\n- Biết sourcing trên LinkedIn và cộng đồng nghề nghiệp\n- Giao tiếp rõ ràng, theo dõi pipeline cẩn thận\n- Ưu tiên từng tuyển vị trí tech",
    benefits:
      "- Lương 700 – 1,200 USD\n- Commission theo vị trí tuyển thành công\n- Đào tạo sourcing và interviewing\n- Văn phòng trung tâm Quận 1",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🌹",
  },
  {
    title: "Finance Controller",
    slug: "finance-controller",
    company: "Golden Bean",
    department: "Finance",
    locations: ["Hải Phòng"],
    employment: "Full-time",
    level: "Manager",
    salaryRange: "1,800 – 3,000 USD",
    tags: ["Finance", "Budgeting", "Compliance"],
    description:
      "Golden Bean cần **Finance Controller** quản lý ngân sách, báo cáo tài chính và kiểm soát chi phí cho chuỗi bán lẻ đang mở rộng.\n\nVai trò này phối hợp trực tiếp với CEO và Operations để đảm bảo quyết định kinh doanh dựa trên số liệu chính xác.",
    requirements:
      "- 5+ năm kinh nghiệm finance/accounting\n- Có kinh nghiệm budgeting và management reporting\n- Hiểu chuẩn mực kế toán Việt Nam\n- Kỹ năng kiểm soát nội bộ và phân tích chi phí",
    benefits:
      "- Lương 1,800 – 3,000 USD\n- Bonus năm theo kết quả kinh doanh\n- Bảo hiểm sức khỏe cho gia đình\n- Cơ hội xây dựng finance function từ sớm",
    status: JobStatus.DRAFT,
    urgent: false,
    logo: "📊",
  },
  {
    title: "Content Strategist",
    slug: "content-strategist",
    company: "Velvet Media",
    department: "Content",
    locations: ["Hà Nội", "TP Hồ Chí Minh"],
    employment: "Hybrid",
    level: "Mid-level",
    salaryRange: "900 – 1,600 USD",
    tags: ["Content", "SEO", "Brand Voice"],
    description:
      "Velvet Media tuyển **Content Strategist** để xây dựng chiến lược nội dung cho các thương hiệu lifestyle và công nghệ.\n\nBạn sẽ nghiên cứu audience, thiết kế content pillar và phối hợp cùng designer/video team để triển khai chiến dịch.",
    requirements:
      "- 3+ năm kinh nghiệm content marketing\n- Có portfolio bài viết hoặc campaign rõ ràng\n- Hiểu SEO, social content và brand voice\n- Kỹ năng brief creative team tốt",
    benefits:
      "- Lương 900 – 1,600 USD\n- Hybrid linh hoạt\n- Budget tham gia workshop marketing\n- Làm việc với nhiều thương hiệu đa ngành",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🎨",
  },
  {
    title: "Sales Executive B2B",
    slug: "sales-executive-b2b",
    company: "BlueBridge CRM",
    department: "Sales",
    locations: ["TP Hồ Chí Minh"],
    employment: "Full-time",
    level: "Junior",
    salaryRange: "800 – 1,500 USD",
    tags: ["B2B Sales", "CRM", "Pipeline"],
    description:
      "BlueBridge CRM tuyển **Sales Executive B2B** để phát triển khách hàng SME tại Việt Nam.\n\nBạn sẽ prospect, demo sản phẩm, quản lý pipeline và phối hợp Customer Success để chuyển giao khách hàng sau khi chốt deal.",
    requirements:
      "- 1+ năm kinh nghiệm B2B sales hoặc SaaS sales\n- Có khả năng gọi điện, demo và follow up đều đặn\n- Biết dùng CRM để quản lý pipeline\n- Tinh thần ownership cao",
    benefits:
      "- Lương cứng 800 – 1,500 USD\n- Commission theo doanh số\n- Training sales playbook\n- Cơ hội lên Senior Sales trong 12 tháng",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "🌷",
  },
  {
    title: "UX Researcher",
    slug: "ux-researcher",
    company: "Insight Studio",
    department: "Research",
    locations: ["Remote"],
    employment: "Remote",
    level: "Mid-level",
    salaryRange: "1,400 – 2,300 USD",
    tags: ["UX Research", "Interview", "Usability Testing"],
    description:
      "Insight Studio tuyển **UX Researcher** để thực hiện nghiên cứu người dùng cho các sản phẩm fintech, healthtech và education.\n\nBạn sẽ lập kế hoạch research, phỏng vấn người dùng, phân tích insight và trình bày khuyến nghị cho product teams.",
    requirements:
      "- 2+ năm kinh nghiệm UX research\n- Thành thạo user interview và usability testing\n- Biết tổng hợp insight thành recommendation rõ ràng\n- Có thể làm việc remote độc lập",
    benefits:
      "- Remote toàn thời gian\n- Lương 1,400 – 2,300 USD\n- Research tool budget\n- Lịch làm việc linh hoạt",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🦋",
  },
  {
    title: "Office Admin",
    slug: "office-admin",
    company: "Cedar Works",
    department: "Operations",
    locations: ["Quảng Ninh"],
    employment: "Full-time",
    level: "Junior",
    salaryRange: "500 – 900 USD",
    tags: ["Admin", "Operations", "Vendor"],
    description:
      "Cedar Works tuyển **Office Admin** phụ trách vận hành văn phòng, quản lý nhà cung cấp và hỗ trợ các hoạt động nội bộ.\n\nBạn sẽ đảm bảo văn phòng hoạt động trơn tru, xử lý mua sắm, lịch họp và hồ sơ hành chính cơ bản.",
    requirements:
      "- 1+ năm kinh nghiệm hành chính hoặc vận hành văn phòng\n- Cẩn thận, giao tiếp tốt với vendor\n- Biết dùng Google Workspace hoặc Microsoft Office\n- Ưu tiên ứng viên tại Quảng Ninh",
    benefits:
      "- Lương 500 – 900 USD\n- Phụ cấp ăn trưa\n- Bảo hiểm đầy đủ\n- Môi trường ổn định, ít overtime",
    status: JobStatus.CLOSED,
    urgent: false,
    logo: "🌿",
  },
  {
    title: "Machine Learning Engineer",
    slug: "machine-learning-engineer",
    company: "Aurora AI",
    department: "AI",
    locations: ["Hà Nội", "Remote"],
    employment: "Hybrid",
    level: "Senior",
    salaryRange: "2,500 – 4,500 USD",
    tags: ["Machine Learning", "Python", "LLM"],
    description:
      "Aurora AI tuyển **Machine Learning Engineer** để xây dựng pipeline AI cho xử lý ngôn ngữ tiếng Việt.\n\nBạn sẽ làm việc với data, model evaluation, serving và phối hợp product team để đưa AI feature vào sản phẩm thực tế.",
    requirements:
      "- 4+ năm kinh nghiệm ML/AI engineering\n- Thành thạo Python, PyTorch hoặc TensorFlow\n- Có kinh nghiệm NLP hoặc LLM application\n- Hiểu model evaluation và production serving",
    benefits:
      "- Lương 2,500 – 4,500 USD\n- GPU/cloud budget\n- Hybrid tại Hà Nội hoặc remote\n- Làm việc với bài toán tiếng Việt thực tế",
    status: JobStatus.PUBLISHED,
    urgent: true,
    logo: "⭐",
  },
  {
    title: "Legal Counsel",
    slug: "legal-counsel",
    company: "RiverBank Digital",
    department: "Legal",
    locations: ["TP Hồ Chí Minh"],
    employment: "Full-time",
    level: "Senior",
    salaryRange: "1,800 – 3,200 USD",
    tags: ["Legal", "Contracts", "Compliance"],
    description:
      "RiverBank Digital tuyển **Legal Counsel** phụ trách hợp đồng, tuân thủ và tư vấn pháp lý cho sản phẩm tài chính số.\n\nBạn sẽ review hợp đồng thương mại, hỗ trợ compliance và làm việc với đối tác pháp lý bên ngoài khi cần.",
    requirements:
      "- 5+ năm kinh nghiệm pháp chế doanh nghiệp\n- Có kinh nghiệm hợp đồng thương mại và compliance\n- Ưu tiên từng làm fintech hoặc ngân hàng\n- Tiếng Anh pháp lý tốt",
    benefits:
      "- Lương 1,800 – 3,200 USD\n- Bảo hiểm sức khỏe cao cấp\n- Lộ trình lên Legal Lead\n- Làm việc trực tiếp với ban điều hành",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "🌹",
  },
  {
    title: "Graphic Designer",
    slug: "graphic-designer",
    company: "Mint Creative",
    department: "Design",
    locations: ["Đà Nẵng"],
    employment: "Full-time",
    level: "Junior",
    salaryRange: "700 – 1,200 USD",
    tags: ["Graphic Design", "Branding", "Adobe"],
    description:
      "Mint Creative tuyển **Graphic Designer** để thiết kế nhận diện thương hiệu, social assets và campaign visuals cho khách hàng SME.\n\nBạn sẽ làm việc cùng Art Director, nhận brief và triển khai thiết kế đúng guideline.",
    requirements:
      "- 1+ năm kinh nghiệm graphic design\n- Thành thạo Illustrator, Photoshop hoặc Figma\n- Có portfolio branding/social design\n- Cẩn thận với layout, typography và màu sắc",
    benefits:
      "- Lương 700 – 1,200 USD\n- Mentorship từ Art Director\n- Budget học thiết kế\n- Văn phòng tại trung tâm Đà Nẵng",
    status: JobStatus.ARCHIVED,
    urgent: false,
    logo: "🎨",
  },
  {
    title: "Data Engineer",
    slug: "data-engineer",
    company: "NorthStar Data",
    department: "Data Platform",
    locations: ["Hà Nội", "TP Hồ Chí Minh"],
    employment: "Hybrid",
    level: "Mid-level",
    salaryRange: "1,800 – 3,000 USD",
    tags: ["ETL", "Spark", "Data Warehouse"],
    description:
      "NorthStar Data tuyển **Data Engineer** xây dựng data pipeline và warehouse cho khách hàng enterprise.\n\nBạn sẽ thiết kế ETL, tối ưu batch jobs và đảm bảo dữ liệu sạch, đúng SLA cho analytics teams.",
    requirements:
      "- 3+ năm kinh nghiệm data engineering\n- Thành thạo SQL và Python\n- Có kinh nghiệm Spark, Airflow hoặc dbt\n- Hiểu mô hình data warehouse và data quality",
    benefits:
      "- Lương 1,800 – 3,000 USD\n- Hybrid tại Hà Nội/HCM\n- Cloud certification support\n- Dự án data quy mô lớn",
    status: JobStatus.PUBLISHED,
    urgent: false,
    logo: "📊",
  },
];

const candidates = [
  {
    fullName: "Nguyễn Thị Lan",
    email: "lan.nguyen@gmail.com",
    phone: "0912 345 678",
    cvUrl: "https://drive.google.com/file/d/example1",
    notes: "Từng làm tại Grab Design team 3 năm, rất hứng thú với vị trí này.",
    jobSlug: "senior-product-designer",
    status: ApplicationStatus.REVIEWING,
    appliedAt: "2026-07-07",
    followUpAt: "2026-07-12",
    score: 92,
    summary:
      "Ứng viên rất phù hợp với vị trí. Có nền tảng thiết kế vững, portfolio đa dạng và kinh nghiệm thực tế tại công ty product lớn.",
    strengths: [
      "5 năm kinh nghiệm tại Grab và MoMo",
      "Portfolio Design System chuyên nghiệp",
      "Kỹ năng giao tiếp và trình bày xuất sắc",
    ],
    risks: ["Chưa có kinh nghiệm lead team"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Tại sao bạn muốn ứng tuyển vị trí này?",
        a: "Tôi muốn đóng góp vào một sản phẩm từ giai đoạn sớm và xây dựng design culture từ đầu.",
      },
    ],
  },
  {
    fullName: "Trần Minh Khoa",
    email: "khoa.tran@outlook.com",
    phone: "0978 123 456",
    cvUrl: "https://drive.google.com/file/d/example2",
    notes: "4 năm React, có kinh nghiệm Next.js và Tailwind.",
    jobSlug: "frontend-engineer-react",
    status: ApplicationStatus.INTERVIEW,
    appliedAt: "2026-07-06",
    followUpAt: "2026-07-10",
    score: 87,
    summary:
      "Ứng viên mạnh về technical, code sample chất lượng tốt. Cần kiểm tra thêm kỹ năng communication trong môi trường Hybrid.",
    strengths: [
      "4 năm React + TypeScript thực chiến",
      "Có OSS contributions trên GitHub",
      "Đã làm với Next.js App Router",
    ],
    risks: ["Tiếng Anh viết chưa thật sự mạnh"],
    missingRequirements: ["Chưa có kinh nghiệm với TailwindCSS cấp độ nâng cao"],
    screeningAnswers: [
      {
        q: "Bạn xử lý performance issues trong React như thế nào?",
        a: "Tôi dùng React DevTools Profiler để identify bottlenecks, sau đó áp dụng memo, useMemo, lazy loading tuỳ từng case.",
      },
    ],
  },
  {
    fullName: "Lê Thu Hương",
    email: "huong.le@yahoo.com",
    phone: "0901 234 567",
    cvUrl: "https://drive.google.com/file/d/example3",
    notes: "Từng làm Digital Marketing tại Shopee 3 năm.",
    jobSlug: "marketing-manager",
    status: ApplicationStatus.NEW,
    appliedAt: "2026-07-08",
    followUpAt: "2026-07-14",
    score: 74,
    summary:
      "Ứng viên có kinh nghiệm thực chiến tốt tại e-commerce. Cần đánh giá thêm khả năng brand strategy và lead team.",
    strengths: [
      "Kinh nghiệm campaign management tại Shopee",
      "Thành thạo Meta Ads và Google Ads",
      "Data-driven mindset rõ ràng",
    ],
    risks: ["Chưa quản lý team trước đây", "Kinh nghiệm brand strategy còn hạn chế"],
    missingRequirements: ["Chưa có kinh nghiệm manage team"],
    screeningAnswers: [],
  },
  {
    fullName: "Phạm Đức Anh",
    email: "duc.anh@gmail.com",
    phone: "0935 678 901",
    cvUrl: "https://drive.google.com/file/d/example4",
    notes: "Portfolio Figma rất ấn tượng, apply từ referral của team.",
    jobSlug: "senior-product-designer",
    status: ApplicationStatus.OFFER,
    appliedAt: "2026-07-04",
    followUpAt: "2026-07-11",
    score: 95,
    summary:
      "Top candidate. Kinh nghiệm toàn diện, portfolio cực kỳ mạnh, văn hóa match tốt. Nên offer ngay trước khi bị competitor mất.",
    strengths: [
      "6 năm kinh nghiệm, 3 năm lead team design",
      "Design system được dùng cho 500K+ users",
      "Đã từng mentor junior designers",
    ],
    risks: [],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Kể về design system bạn đã xây dựng.",
        a: "Tôi xây Lumi Design System cho Tiki trong 8 tháng, hiện đang được dùng bởi 12 product teams với 200+ components.",
      },
    ],
  },
  {
    fullName: "Vũ Ngọc Bảo",
    email: "bao.vu@proton.me",
    phone: "0968 456 789",
    cvUrl: "https://drive.google.com/file/d/example5",
    notes: "",
    jobSlug: "frontend-engineer-react",
    status: ApplicationStatus.REJECTED,
    appliedAt: "2026-07-05",
    followUpAt: null,
    score: 48,
    summary:
      "Ứng viên chưa đủ kinh nghiệm cho Senior level. CV thiếu chi tiết, không có portfolio code sample.",
    strengths: ["Nhiệt tình, eager to learn"],
    risks: ["1 năm kinh nghiệm — không đủ yêu cầu", "Không có code sample hoặc portfolio"],
    missingRequirements: ["Thiếu 2+ năm kinh nghiệm", "Không có TypeScript experience"],
    screeningAnswers: [],
  },
  {
    fullName: "Đỗ Minh Quân",
    email: "quan.do@gmail.com",
    phone: "0987 654 321",
    cvUrl: "https://drive.google.com/file/d/example6",
    notes: "Backend engineer từng làm payment gateway, có kinh nghiệm NestJS và PostgreSQL.",
    jobSlug: "backend-engineer-nodejs",
    status: ApplicationStatus.REVIEWING,
    appliedAt: "2026-07-09",
    followUpAt: "2026-07-15",
    score: 88,
    summary:
      "Ứng viên phù hợp mạnh với Backend Engineer. Có kinh nghiệm fintech, hiểu transaction và đã vận hành hệ thống thanh toán production.",
    strengths: [
      "5 năm backend Node.js",
      "Có kinh nghiệm payment gateway",
      "Nắm chắc PostgreSQL transaction và indexing",
    ],
    risks: ["Chưa từng quản lý junior developer"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Bạn xử lý idempotency trong payment API như thế nào?",
        a: "Tôi dùng idempotency key, unique constraint ở DB và transaction boundary rõ ràng để tránh double charge.",
      },
    ],
  },
  {
    fullName: "Hoàng Mai Anh",
    email: "mai.anh@icloud.com",
    phone: "0919 222 333",
    cvUrl: "https://drive.google.com/file/d/example7",
    notes: "QA automation có Playwright, từng setup test pipeline cho SaaS.",
    jobSlug: "qa-automation-engineer",
    status: ApplicationStatus.CONTACTED,
    appliedAt: "2026-07-09",
    followUpAt: "2026-07-16",
    score: 81,
    summary:
      "Ứng viên có nền tảng QA automation tốt, phù hợp với nhu cầu xây dựng Playwright suite và test API.",
    strengths: [
      "3 năm QA automation",
      "Thành thạo Playwright và API testing",
      "Có kinh nghiệm tích hợp test vào CI",
    ],
    risks: ["Kinh nghiệm performance testing còn ít"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Bạn ưu tiên test case automation như thế nào?",
        a: "Tôi ưu tiên critical user flows, regression risk cao và API contracts trước khi mở rộng sang edge cases.",
      },
    ],
  },
  {
    fullName: "Nguyễn Gia Hân",
    email: "gia.han@gmail.com",
    phone: "0908 333 444",
    cvUrl: "https://drive.google.com/file/d/example8",
    notes: "Product Manager có kinh nghiệm growth funnel ở e-commerce.",
    jobSlug: "product-manager",
    status: ApplicationStatus.SCREENING,
    appliedAt: "2026-07-10",
    followUpAt: "2026-07-17",
    score: 84,
    summary:
      "Ứng viên có kinh nghiệm product growth phù hợp. Cần đánh giá thêm khả năng quản lý stakeholder ở quy mô lớn.",
    strengths: [
      "4 năm product management",
      "Có case tăng conversion checkout",
      "Viết PRD và phân tích funnel tốt",
    ],
    risks: ["Chưa từng quản lý roadmap đa quốc gia"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Bạn chọn metric chính cho growth funnel như thế nào?",
        a: "Tôi bắt đầu từ business goal, tách leading/lagging metrics và theo dõi từng bước funnel để tìm constraint.",
      },
    ],
  },
  {
    fullName: "Bùi Nhật Nam",
    email: "nhat.nam@outlook.com",
    phone: "0977 888 999",
    cvUrl: "https://drive.google.com/file/d/example9",
    notes: "DevOps remote, có AWS/Kubernetes/Terraform.",
    jobSlug: "devops-engineer",
    status: ApplicationStatus.INTERVIEW,
    appliedAt: "2026-07-10",
    followUpAt: "2026-07-18",
    score: 90,
    summary:
      "Ứng viên DevOps rất mạnh, có kinh nghiệm Kubernetes production và incident response. Nên ưu tiên phỏng vấn kỹ thuật sớm.",
    strengths: [
      "AWS và Kubernetes production",
      "Terraform module hóa tốt",
      "Có kinh nghiệm observability và on-call",
    ],
    risks: ["Kỳ vọng remote-first cần xác nhận thêm"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Bạn thiết kế alert thế nào để giảm noise?",
        a: "Tôi alert theo user impact và SLO, gom low-signal metrics vào dashboard thay vì page on-call.",
      },
    ],
  },
  {
    fullName: "Trịnh Thu Trang",
    email: "thu.trang@yahoo.com",
    phone: "0933 444 555",
    cvUrl: "https://drive.google.com/file/d/example10",
    notes: "Recruiter junior, có sourcing tech trên LinkedIn.",
    jobSlug: "talent-acquisition-specialist",
    status: ApplicationStatus.NEW,
    appliedAt: "2026-07-11",
    followUpAt: "2026-07-19",
    score: 69,
    summary:
      "Ứng viên có nền tảng recruitment phù hợp junior. Cần hướng dẫn thêm về stakeholder management và closing candidate.",
    strengths: [
      "Có kinh nghiệm sourcing tech",
      "Theo dõi pipeline cẩn thận",
      "Giao tiếp thân thiện với ứng viên",
    ],
    risks: ["Chưa tuyển nhiều vị trí senior engineering"],
    missingRequirements: ["Kinh nghiệm tuyển tech senior còn hạn chế"],
    screeningAnswers: [
      {
        q: "Bạn duy trì pipeline sourcing như thế nào?",
        a: "Tôi chia target theo tuần, dùng template cá nhân hóa và follow up sau 3-5 ngày nếu chưa phản hồi.",
      },
    ],
  },
  {
    fullName: "Phan Khánh Linh",
    email: "khanh.linh@proton.me",
    phone: "0922 111 222",
    cvUrl: "https://drive.google.com/file/d/example11",
    notes: "ML Engineer có NLP tiếng Việt, từng deploy model serving bằng FastAPI.",
    jobSlug: "machine-learning-engineer",
    status: ApplicationStatus.TALENT_POOL,
    appliedAt: "2026-07-11",
    followUpAt: "2026-07-20",
    score: 86,
    summary:
      "Ứng viên mạnh về NLP tiếng Việt và production serving. Phù hợp talent pool chất lượng cao nếu chưa mở headcount ngay.",
    strengths: [
      "4 năm ML/NLP",
      "Có kinh nghiệm LLM application",
      "Đã deploy model serving production",
    ],
    risks: ["Chưa rõ kinh nghiệm làm việc với dataset quy mô rất lớn"],
    missingRequirements: [],
    screeningAnswers: [
      {
        q: "Bạn đánh giá model NLP tiếng Việt như thế nào?",
        a: "Tôi dùng benchmark task-specific, human review sampling và theo dõi drift sau khi model lên production.",
      },
    ],
  },
];

const templates = [
  {
    name: "Mời phỏng vấn",
    channel: "Zalo / Messenger",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã ứng tuyển vị trí **[Tên vị trí]** tại **[Tên công ty]**.\n\nSau khi xem xét hồ sơ của bạn, chúng tôi rất ấn tượng và muốn mời bạn tham gia buổi phỏng vấn:\n\n📅 Thời gian: [Ngày/giờ]\n📍 Hình thức: [Online / Offline tại địa chỉ...]\n\nBạn có thể tham gia vào thời điểm trên không? Nếu cần đổi lịch, hãy cho tôi biết nhé.\n\nTrân trọng,\nLường Bích — TA Consultant",
  },
  {
    name: "Follow-up sau phỏng vấn",
    channel: "Email / Zalo",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã dành thời gian tham gia buổi phỏng vấn ngày [Ngày]. Tôi rất vui được trò chuyện với bạn!\n\nChúng tôi đang trong quá trình tổng hợp kết quả và sẽ có phản hồi sớm nhất trong vòng [X ngày làm việc].\n\nNếu bạn có bất kỳ câu hỏi nào trong thời gian này, đừng ngần ngại liên hệ với tôi.\n\nTrân trọng,\nLường Bích",
  },
  {
    name: "Offer Letter thông báo",
    channel: "Email",
    content:
      "Chào [Tên ứng viên],\n\nChúng tôi rất vui được thông báo rằng bạn đã được chọn cho vị trí **[Tên vị trí]** tại **[Tên công ty]**!\n\nDưới đây là các điều khoản chính:\n- Mức lương: [Lương]\n- Ngày bắt đầu: [Ngày]\n- Hình thức làm việc: [Full-time / Hybrid / Remote]\n\nChúng tôi sẽ gửi Offer Letter chính thức qua email trong 24 giờ tới.\n\nChúc mừng và mong được chào đón bạn trong team!\n\nTrân trọng,\nLường Bích",
  },
  {
    name: "Từ chối khéo léo",
    channel: "Email / Zalo",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã dành thời gian và công sức ứng tuyển vị trí **[Tên vị trí]**.\n\nSau khi xem xét kỹ lưỡng, chúng tôi đã quyết định tiến hành với ứng viên khác có kinh nghiệm phù hợp hơn với yêu cầu hiện tại của vị trí này.\n\nĐây không phản ánh giá trị hay năng lực của bạn — chúng tôi tin rằng bạn sẽ tìm được cơ hội thật sự phù hợp. Chúng tôi sẽ giữ CV của bạn trong talent pool và liên hệ khi có vị trí phù hợp hơn.\n\nChúc bạn nhiều thành công!\n\nTrân trọng,\nLường Bích",
  },
  {
    name: "Thêm vào Talent Pool",
    channel: "Zalo / LinkedIn",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã quan tâm đến các vị trí tại chúng tôi!\n\nMặc dù vị trí bạn ứng tuyển hiện đã được lấp đầy, hồ sơ của bạn đã để lại ấn tượng rất tốt. Tôi muốn giữ kết nối và liên hệ khi có cơ hội phù hợp trong tương lai.\n\nBạn có đồng ý để tôi thêm bạn vào talent network của mình không?\n\nTrân trọng,\nLường Bích — TA Consultant",
  },
  {
    name: "Nhắc lịch phỏng vấn",
    channel: "Zalo",
    content:
      "Chào [Tên ứng viên] 👋\n\nNhắc nhỏ buổi phỏng vấn của bạn cho vị trí **[Tên vị trí]**:\n\n📅 [Ngày, thứ] lúc [Giờ]\n📍 [Hình thức / Link / Địa chỉ]\n\nNếu có bất kỳ vấn đề gì, hãy nhắn tôi trước 2 tiếng nhé!\n\nHẹn gặp bạn sớm 🌸",
  },
];

async function main() {
  const templateNames = [
    ...templates.map((template) => template.name),
    "Mock - First outreach",
    "Mock - Follow up 1",
    "Mock - Interview invite",
    "Mock - Rejection",
  ];

  await prisma.messageTemplate.deleteMany({
    where: { name: { in: templateNames } },
  });

  const mockCandidates = await prisma.candidate.findMany({
    where: { source: "frontend_mock" },
    select: { id: true },
  });
  const mockCandidateIds = mockCandidates.map((candidate) => candidate.id);
  const mockApplications = mockCandidateIds.length
    ? await prisma.application.findMany({
      where: { candidateId: { in: mockCandidateIds } },
      select: { id: true },
    })
    : [];
  const mockApplicationIds = mockApplications.map((application) => application.id);

  if (mockApplicationIds.length) {
    await prisma.candidateMessage.deleteMany({
      where: { applicationId: { in: mockApplicationIds } },
    });
    await prisma.followUpTask.deleteMany({
      where: { applicationId: { in: mockApplicationIds } },
    });
    await prisma.matchResult.deleteMany({
      where: { applicationId: { in: mockApplicationIds } },
    });
    await prisma.cvParseResult.deleteMany({
      where: { applicationId: { in: mockApplicationIds } },
    });
    await prisma.candidateFile.deleteMany({
      where: { applicationId: { in: mockApplicationIds } },
    });
    await prisma.application.deleteMany({
      where: { id: { in: mockApplicationIds } },
    });
  }

  if (mockCandidateIds.length) {
    await prisma.activityLog.deleteMany({
      where: { candidateId: { in: mockCandidateIds } },
    });
  }

  await prisma.candidate.deleteMany({
    where: { source: "frontend_mock" },
  });

  const createdJobs = new Map<string, { id: string; title: string }>();

  for (const job of jobs) {
    const { slug, ...jobData } = job;
    const created = await prisma.job.upsert({
      where: { slug },
      create: job,
      update: jobData,
    });
    createdJobs.set(job.slug, { id: created.id, title: created.title });
  }

  await prisma.messageTemplate.createMany({ data: templates });

  for (const candidateData of candidates) {
    const job = createdJobs.get(candidateData.jobSlug);

    if (!job) {
      throw new Error(`Seed job not found for slug ${candidateData.jobSlug}`);
    }

    const createdAt = new Date(`${candidateData.appliedAt}T09:00:00.000Z`);
    const candidate = await prisma.candidate.create({
      data: {
        fullName: candidateData.fullName,
        email: candidateData.email,
        normalizedEmail: normalizeEmail(candidateData.email),
        phone: candidateData.phone,
        normalizedPhone: normalizePhone(candidateData.phone),
        portfolioUrl: candidateData.cvUrl,
        source: "frontend_mock",
        createdAt,
      },
    });

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        submittedFullName: candidateData.fullName,
        submittedEmail: candidateData.email,
        submittedPhone: candidateData.phone,
        submittedPortfolioUrl: candidateData.cvUrl,
        normalizedEmail: normalizeEmail(candidateData.email),
        normalizedPhone: normalizePhone(candidateData.phone),
        status: candidateData.status,
        coverNote: candidateData.notes || null,
        answers: {
          coverNote: candidateData.notes,
          screeningAnswers: candidateData.screeningAnswers,
        },
        consentAccepted: true,
        createdAt,
      },
    });

    const candidateFile = await prisma.candidateFile.create({
      data: {
        applicationId: application.id,
        kind: FileKind.CV,
        originalName: `${candidateData.fullName.replace(/\s+/g, "-")}-CV-link`,
        storedName: `${candidate.id}-external-cv-link`,
        mimeType: "text/uri-list",
        sizeBytes: 0,
        path: candidateData.cvUrl,
        createdAt,
      },
    });

    await prisma.cvParseResult.create({
      data: {
        applicationId: application.id,
        candidateFileId: candidateFile.id,
        status: CvParseStatus.COMPLETED,
        summary: candidateData.summary,
        structuredData: {
          source: "frontend_mock",
          screeningAnswers: candidateData.screeningAnswers,
        },
        extractedText: `Frontend mock CV text for ${candidateData.fullName}.`,
        createdAt,
      },
    });

    await prisma.matchResult.create({
      data: {
        applicationId: application.id,
        score: candidateData.score,
        strengths: candidateData.strengths,
        risks: candidateData.risks,
        missingRequirements: candidateData.missingRequirements,
        screeningQuestions: candidateData.screeningAnswers.map((item) => item.q),
        createdAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        candidateId: candidate.id,
        applicationId: application.id,
        jobId: job.id,
        candidateFileId: candidateFile.id,
        actor: "candidate",
        action: "frontend_mock_application_seeded",
        metadata: {
          applicationId: application.id,
          candidateFileId: candidateFile.id,
          jobId: job.id,
          jobTitle: job.title,
          status: candidateData.status,
        },
        createdAt,
      },
    });

    if (candidateData.followUpAt && candidateData.status !== ApplicationStatus.REJECTED && candidateData.status !== ApplicationStatus.OFFER) {
      await prisma.followUpTask.create({
        data: {
          applicationId: application.id,
          title: `Follow up ${candidateData.fullName} for ${job.title}`,
          dueAt: new Date(`${candidateData.followUpAt}T09:00:00.000Z`),
          createdAt,
        },
      });
    }
  }

  console.log(`Seeded ${jobs.length} frontend mock jobs and ${candidates.length} frontend mock candidates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith("84")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}
