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
    location: "Hà Nội",
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
    location: "TP Hồ Chí Minh",
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
    location: "Đà Nẵng",
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
    title: "HR Business Partner",
    slug: "hr-business-partner",
    company: "Rosé Ventures",
    department: "People",
    location: "Hà Nội",
    employment: "Full-time",
    level: "Senior",
    salaryRange: "1,200 – 2,000 USD",
    tags: ["HR", "Recruitment", "People Ops"],
    description:
      "Rosé Ventures tuyển **HR Business Partner** để hỗ trợ phát triển đội ngũ và văn hóa tổ chức trên toàn Việt Nam.\n\nVị trí này đòi hỏi khả năng kết hợp giữa tư duy chiến lược và kỹ năng thực thi tốc độ cao trong môi trường startup đang scale.",
    requirements:
      "- 4+ năm kinh nghiệm HR\n- Nền tảng HRBP hoặc HR Generalist\n- Kỹ năng lắng nghe và coaching xuất sắc\n- Am hiểu Luật Lao động Việt Nam\n- Kinh nghiệm trong môi trường startup là lợi thế",
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
    location: "TP Hồ Chí Minh",
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
    location: "Hà Nội",
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
];

const templates = [
  {
    name: "Mời phỏng vấn",
    channel: "Zalo / Messenger",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã ứng tuyển vị trí **[Tên vị trí]** tại **[Tên công ty]**.\n\nSau khi xem xét hồ sơ của bạn, chúng tôi rất ấn tượng và muốn mời bạn tham gia buổi phỏng vấn:\n\n📅 Thời gian: [Ngày/giờ]\n📍 Hình thức: [Online / Offline tại địa chỉ...]\n\nBạn có thể tham gia vào thời điểm trên không? Nếu cần đổi lịch, hãy cho tôi biết nhé.\n\nTrân trọng,\nLường Thị Bích — HR Consultant",
  },
  {
    name: "Follow-up sau phỏng vấn",
    channel: "Email / Zalo",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã dành thời gian tham gia buổi phỏng vấn ngày [Ngày]. Tôi rất vui được trò chuyện với bạn!\n\nChúng tôi đang trong quá trình tổng hợp kết quả và sẽ có phản hồi sớm nhất trong vòng [X ngày làm việc].\n\nNếu bạn có bất kỳ câu hỏi nào trong thời gian này, đừng ngần ngại liên hệ với tôi.\n\nTrân trọng,\nLường Thị Bích",
  },
  {
    name: "Offer Letter thông báo",
    channel: "Email",
    content:
      "Chào [Tên ứng viên],\n\nChúng tôi rất vui được thông báo rằng bạn đã được chọn cho vị trí **[Tên vị trí]** tại **[Tên công ty]**!\n\nDưới đây là các điều khoản chính:\n- Mức lương: [Lương]\n- Ngày bắt đầu: [Ngày]\n- Hình thức làm việc: [Full-time / Hybrid / Remote]\n\nChúng tôi sẽ gửi Offer Letter chính thức qua email trong 24 giờ tới.\n\nChúc mừng và mong được chào đón bạn trong team!\n\nTrân trọng,\nLường Thị Bích",
  },
  {
    name: "Từ chối khéo léo",
    channel: "Email / Zalo",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã dành thời gian và công sức ứng tuyển vị trí **[Tên vị trí]**.\n\nSau khi xem xét kỹ lưỡng, chúng tôi đã quyết định tiến hành với ứng viên khác có kinh nghiệm phù hợp hơn với yêu cầu hiện tại của vị trí này.\n\nĐây không phản ánh giá trị hay năng lực của bạn — chúng tôi tin rằng bạn sẽ tìm được cơ hội thật sự phù hợp. Chúng tôi sẽ giữ CV của bạn trong talent pool và liên hệ khi có vị trí phù hợp hơn.\n\nChúc bạn nhiều thành công!\n\nTrân trọng,\nLường Thị Bích",
  },
  {
    name: "Thêm vào Talent Pool",
    channel: "Zalo / LinkedIn",
    content:
      "Chào [Tên ứng viên],\n\nCảm ơn bạn đã quan tâm đến các vị trí tại chúng tôi!\n\nMặc dù vị trí bạn ứng tuyển hiện đã được lấp đầy, hồ sơ của bạn đã để lại ấn tượng rất tốt. Tôi muốn giữ kết nối và liên hệ khi có cơ hội phù hợp trong tương lai.\n\nBạn có đồng ý để tôi thêm bạn vào talent network của mình không?\n\nTrân trọng,\nLường Thị Bích — HR Consultant",
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
