const bcrypt = require('bcryptjs');
const { getDb, initializeDb } = require('./schema');

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

function seed() {
  initializeDb();
  const db = getDb();

  // Clear existing data
  db.exec(`
    DELETE FROM reviews;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  // --- Admin User ---
  const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
    .run('Admin', process.env.ADMIN_EMAIL || 'admin@roboshop.com', adminHash);

  // Demo user
  const userHash = bcrypt.hashSync('User123!', 10);
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')`)
    .run('Demo Kullanıcı', 'demo@roboshop.com', userHash);

  // --- Categories ---
  const insertCategory = db.prepare(
    `INSERT INTO categories (name, slug, icon, description, image_url) VALUES (?, ?, ?, ?, ?)`
  );

  const categories = [
    ['Endüstriyel Robot Kollar', 'endustriyel-robot-kollar', '🤖', 'Üretim hatları için yüksek hassasiyetli endüstriyel robot kolları', '/images/categories/robot-arms.svg'],
    ['Drone Sistemleri', 'drone-sistemleri', '🚁', 'Profesyonel ve ticari drone çözümleri', '/images/categories/drones.svg'],
    ['Ev Otomasyon Robotları', 'ev-otomasyon-robotlari', '🏠', 'Akıllı ev için otomasyon robotları', '/images/categories/home-robots.svg'],
    ['Eğitim Robotları', 'egitim-robotlari', '🔬', 'STEM eğitimi için programlanabilir robotlar', '/images/categories/education-robots.svg'],
    ['Robotik Protez & Exoskeleton', 'robotik-protez-exoskeleton', '🦾', 'Biyonik protez ve güç artırıcı exoskeletonlar', '/images/categories/prosthetics.svg'],
    ['Güvenlik Robotları', 'guvenlik-robotlari', '🛡️', 'Otonom güvenlik ve gözetleme robotları', '/images/categories/security-robots.svg'],
    ['Otonom Taşıma Robotları', 'otonom-tasima-robotlari', '📦', 'Depo ve lojistik otomasyon robotları', '/images/categories/transport-robots.svg'],
    ['AI Geliştirme Kitleri', 'ai-gelistirme-kitleri', '🧠', 'Yapay zeka ve makine öğrenmesi geliştirme kitleri', '/images/categories/ai-kits.svg'],
  ];

  for (const cat of categories) {
    insertCategory.run(...cat);
  }

  // --- Products ---
  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, slug, description, specs, price, discount_price, stock, image_url, featured, rating, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    // Category 1: Endüstriyel Robot Kollar
    [1, 'RoboArm Pro X7', 'roboarm-pro-x7',
      'Yüksek hassasiyetli 7 eksenli endüstriyel robot kolu. Otomotiv, elektronik ve gıda sektörlerinde üretim hatlarında kullanıma uygundur. 10kg taşıma kapasitesi ve ±0.02mm tekrarlanabilirlik hassasiyeti ile üstün performans sunar.',
      JSON.stringify({ 'Eksen Sayısı': '7', 'Taşıma Kapasitesi': '10 kg', 'Menzil': '1400 mm', 'Hassasiyet': '±0.02 mm', 'Ağırlık': '55 kg', 'Güç Tüketimi': '1.5 kW', 'Koruma Sınıfı': 'IP67' }),
      285000, 259000, 12, '/images/products/robot_arm.png', 1, 4.8, 24],

    [1, 'RoboArm Lite S3', 'roboarm-lite-s3',
      'Kompakt 6 eksenli robot kolu, küçük ve orta ölçekli üretim tesisleri için ideal çözüm. Kolay programlanabilir arayüzü sayesinde hızlı kurulum ve devreye alma imkanı sunar.',
      JSON.stringify({ 'Eksen Sayısı': '6', 'Taşıma Kapasitesi': '5 kg', 'Menzil': '900 mm', 'Hassasiyet': '±0.05 mm', 'Ağırlık': '28 kg', 'Güç Tüketimi': '0.8 kW', 'Koruma Sınıfı': 'IP54' }),
      145000, null, 25, '/images/products/roboarm-lite-s3.png', 0, 4.5, 18],

    [1, 'CoBot Duo C2', 'cobot-duo-c2',
      'İnsan-robot işbirliği için tasarlanmış kolaboratif robot. Dahili güvenlik sensörleri ile operatörlerle aynı alanda güvenle çalışır. Sezgisel dokunmatik programlama özelliği ile dakikalar içinde yeni görevlere uyarlanır.',
      JSON.stringify({ 'Eksen Sayısı': '6', 'Taşıma Kapasitesi': '12 kg', 'Menzil': '1300 mm', 'Hassasiyet': '±0.03 mm', 'Güvenlik': 'ISO 10218-1 uyumlu', 'Programlama': 'Dokunmatik + Drag&Drop' }),
      198000, 179000, 8, '/images/products/cobot-duo-c2.png', 1, 4.9, 31],

    // Category 2: Drone Sistemleri
    [2, 'SkyHawk Pro 4K', 'skyhawk-pro-4k',
      'Profesyonel hava çekimi için 4K 60fps kameralı drone. 45 dakika uçuş süresi, 15km menzil ve yapay zeka destekli engelden kaçınma sistemi ile endüstriyel inceleme ve haritalama için idealdir.',
      JSON.stringify({ 'Kamera': '4K 60fps, 1-inch CMOS', 'Uçuş Süresi': '45 dakika', 'Menzil': '15 km', 'Hız': '72 km/s', 'Ağırlık': '1.2 kg', 'GPS': 'RTK Hassas Konum', 'Engel Algılama': '360° Omnidirectional' }),
      42000, 37500, 35, '/images/products/drone.png', 1, 4.7, 42],

    [2, 'AgroScan X1', 'agroscan-x1',
      'Tarımsal drone; multispektral kamera ile bitki sağlığı analizi, ilaçlama ve tohum ekimi yapabilir. 20 litre sıvı tankı ve hassas püskürtme sistemi ile büyük tarım alanlarını verimli şekilde kapsar.',
      JSON.stringify({ 'Tank Kapasitesi': '20 L', 'Kapsama Alanı': '10 ha/saat', 'Uçuş Süresi': '25 dakika', 'Menzil': '5 km', 'Kamera': 'Multispektral 5-band', 'Otonom Uçuş': 'RTK + Waypoint' }),
      89000, null, 15, '/images/products/agroscan-x1.png', 0, 4.6, 15],

    [2, 'CargoLift C500', 'cargolift-c500',
      'Ağır yük taşıma dronu; 500kg\'a kadar yük kapasitesi ile lojistik, kurtarma operasyonları ve endüstriyel malzeme taşıma görevlerinde kullanılır. Tam otonom uçuş ve rota planlama özelliği sunar.',
      JSON.stringify({ 'Yük Kapasitesi': '500 kg', 'Uçuş Süresi': '35 dakika (yüksüz)', 'Menzil': '50 km', 'Motor': '8x Brushless 15kW', 'Otonom Seviye': 'Level 4', 'Acil İniş': 'Otomatik Paraşüt' }),
      520000, 475000, 5, '/images/products/cargolift-c500.png', 1, 4.4, 8],

    // Category 3: Ev Otomasyon Robotları
    [3, 'HomeBot Ultra', 'homebot-ultra',
      'Akıllı ev asistanı robot; temizlik, güvenlik devriyesi ve sesli asistan fonksiyonlarını tek cihazda birleştirir. LiDAR navigasyon ile harita oluşturur ve planlı temizlik programları uygular.',
      JSON.stringify({ 'Navigasyon': 'LiDAR + SLAM', 'Batarya': '5200 mAh', 'Çalışma Süresi': '180 dakika', 'Emme Gücü': '4000 Pa', 'Ses Asistanı': 'Google/Alexa uyumlu', 'Kamera': '1080p Güvenlik', 'Uygulama': 'iOS/Android' }),
      18500, 15900, 50, '/images/products/homebot-ultra.png', 1, 4.6, 89],

    [3, 'ChefBot K1', 'chefbot-k1',
      'Mutfak asistanı robot; 200\'den fazla tarif ile otomatik yemek pişirme, malzeme doğrama ve karıştırma işlemlerini gerçekleştirir. Wi-Fi bağlantısı ile uzaktan tarif yükleme ve zamanlama yapılabilir.',
      JSON.stringify({ 'Tarif Sayısı': '200+', 'Pişirme Modları': '12', 'Kapasite': '5 L', 'Doğrama Hızı': '300 rpm', 'Ekran': '10" Dokunmatik', 'Bağlantı': 'Wi-Fi + Bluetooth', 'Güç': '1500 W' }),
      32000, 28500, 30, '/images/products/chefbot-k1.png', 0, 4.3, 45],

    // Category 4: Eğitim Robotları
    [4, 'EduBot Starter Kit', 'edubot-starter-kit',
      'Çocuklar ve gençler için STEM eğitim robotu. Blok tabanlı ve Python programlama desteği ile robotik temelleri öğretir. 12 farklı proje kılavuzu ve 200+ parça içerir.',
      JSON.stringify({ 'Yaş Grubu': '8-16', 'Programlama': 'Scratch + Python', 'Parça Sayısı': '200+', 'Sensörler': 'Ultrasonik, IR, Işık, Dokunma', 'Motor': '4x Servo + 2x DC', 'Bluetooth': 'Var', 'Proje Sayısı': '12' }),
      4500, 3900, 100, '/images/products/edu_robot.png', 1, 4.9, 156],

    [4, 'RoboLab Pro', 'robolab-pro',
      'Üniversite seviyesi robotik geliştirme platformu. ROS2 uyumlu, yapay zeka ve bilgisayarlı görü modülleri ile ileri seviye robot projeleri geliştirmek için idealdir.',
      JSON.stringify({ 'İşlemci': 'Jetson Orin Nano', 'OS': 'Ubuntu 22.04 + ROS2', 'Kamera': 'Stereo Depth', 'LiDAR': '2D 360°', 'RAM': '8 GB', 'Depolama': '128 GB NVMe', 'Programlama': 'C++, Python, ROS2' }),
      28000, null, 20, '/images/products/robolab-pro.png', 0, 4.7, 23],

    // Category 5: Robotik Protez & Exoskeleton
    [5, 'BioHand V3', 'biohand-v3',
      'Myoelektrik kontrollü biyonik el protezi. EMG sensörleri ile kas sinyallerini algılayarak 14 farklı kavrama paterni gerçekleştirir. Doğal görünümlü silikon kaplama seçeneği mevcuttur.',
      JSON.stringify({ 'Kavrama Paterni': '14', 'Kontrol': 'Myoelektrik (EMG)', 'Parmak Sayısı': '5 bağımsız', 'Kavrama Gücü': '140 N', 'Ağırlık': '450 g', 'Batarya': '16 saat', 'Su Dayanıklılığı': 'IP54' }),
      175000, 159000, 8, '/images/products/biohand-v3.png', 1, 4.8, 12],

    [5, 'ExoWalk E1', 'exowalk-e1',
      'Alt ekstremite exoskeleton sistemi; yürüme güçlüğü çeken bireylerin bağımsız yürümesini sağlar. Uyarlanabilir adım algoritması ve terapist kontrol paneli ile rehabilitasyon sürecini hızlandırır.',
      JSON.stringify({ 'Yürüme Hızı': '0.1-1.2 m/s', 'Batarya': '4 saat sürekli', 'Kullanıcı Boyu': '155-190 cm', 'Kullanıcı Ağırlığı': 'max 100 kg', 'Eklem': 'Kalça + Diz + Ayak bileği', 'Kontrol': 'Otomatik + Manuel' }),
      450000, null, 4, '/images/products/exowalk-e1.png', 0, 4.9, 6],

    // Category 6: Güvenlik Robotları
    [6, 'GuardBot S200', 'guardbot-s200',
      'Otonom güvenlik devriye robotu. Termal kamera, hareket algılama ve yüz tanıma ile 7/24 güvenlik sağlar. Şüpheli durumda anlık alarm ve canlı yayın gönderir.',
      JSON.stringify({ 'Kamera': '4K + Termal', 'Gece Görüşü': '30 m IR', 'Batarya': '12 saat', 'Hız': '7 km/s', 'Navigasyon': 'LiDAR + GPS-RTK', 'Yüz Tanıma': 'AI destekli', 'Bağlantı': '4G LTE + Wi-Fi', 'Koruma': 'IP65' }),
      95000, 84900, 18, '/images/products/guardbot-s200.png', 1, 4.5, 27],

    [6, 'DroneGuard DG1', 'droneguard-dg1',
      'Güvenlik gözetleme dronu; otomatik devriye uçuşu, hırsız algılama ve takip özellikli. Güvenlik merkezi ile entegre çalışır ve acil durumlarda otomatik müdahale senaryoları uygular.',
      JSON.stringify({ 'Uçuş Süresi': '40 dakika', 'Kamera': '8K + Termal', 'Gece Görüşü': '200 m', 'Otonom Devriye': 'Evet', 'Sirene': '120 dB', 'Bağlantı': '5G + LoRa', 'Rüzgar Dayanımı': '60 km/s' }),
      68000, null, 22, '/images/products/droneguard-dg1.png', 0, 4.4, 14],

    // Category 7: Otonom Taşıma Robotları
    [7, 'LogiBot L500', 'logibot-l500',
      'Depo otomasyon robotu; 500kg taşıma kapasitesi ile palet, koli ve ağır yükleri otonom olarak taşır. Filo yönetim yazılımı ile onlarca robotun koordineli çalışmasını sağlar.',
      JSON.stringify({ 'Taşıma Kapasitesi': '500 kg', 'Hız': '2 m/s', 'Navigasyon': 'SLAM + QR Code', 'Batarya': '8 saat', 'Şarj Süresi': '1.5 saat', 'Boyut': '800x600x300 mm', 'Filo Yönetimi': 'Merkezi yazılım' }),
      125000, 112000, 30, '/images/products/logibot-l500.png', 1, 4.6, 33],

    [7, 'DeliBot D1', 'delibot-d1',
      'Son mil teslimat robotu; restoran, market ve e-ticaret siparişlerini otonom olarak kapıya teslim eder. Kaldırım navigasyonu ve trafik kurallarına uyumlu yapay zeka ile güvenli teslimat sağlar.',
      JSON.stringify({ 'Yük Kapasitesi': '20 kg', 'Hız': '6 km/s', 'Menzil': '20 km', 'Navigasyon': 'GPS + LiDAR + Kamera', 'Kargo Bölmesi': '80 L termal izoleli', 'Bağlantı': '4G + Wi-Fi', 'Kilit': 'OTP + Yüz tanıma' }),
      55000, 49900, 40, '/images/products/delibot-d1.png', 0, 4.3, 21],

    // Category 8: AI Geliştirme Kitleri
    [8, 'NeuralKit Pro', 'neuralkit-pro',
      'Yapay zeka geliştirme kiti; NVIDIA Jetson tabanlı, bilgisayarlı görü, NLP ve robot kontrolü için hazır modüller içerir. 50+ örnek proje ve Türkçe dokümantasyon ile hızlı başlangıç sağlar.',
      JSON.stringify({ 'İşlemci': 'NVIDIA Jetson AGX Orin', 'GPU': '2048 CUDA Core', 'RAM': '32 GB', 'Kamera': '2x 4K + Depth', 'Sensörler': 'IMU, LiDAR, Mikrofon Dizisi', 'Framework': 'PyTorch, TensorFlow, ROS2', 'Dil': 'Python, C++' }),
      78000, 69900, 15, '/images/products/ai_kit.png', 1, 4.8, 38],

    [8, 'VisionAI Starter', 'visionai-starter',
      'Bilgisayarlı görü başlangıç kiti; nesne algılama, yüz tanıma ve OCR için önceden eğitilmiş modeller içerir. Raspberry Pi tabanlı, uygun fiyatlı AI giriş çözümü.',
      JSON.stringify({ 'İşlemci': 'Raspberry Pi 5', 'AI Hızlandırıcı': 'Google Coral TPU', 'Kamera': '12MP + 120fps', 'RAM': '8 GB', 'Depolama': '64 GB', 'Modeller': '25+ önceden eğitilmiş', 'Framework': 'TensorFlow Lite, MediaPipe' }),
      12500, 10900, 60, '/images/products/edu_robot.png', 0, 4.5, 67],

    [8, 'RoboMind AI Board', 'robomind-ai-board',
      'Robot beyin kartı; otonom navigasyon, ses tanıma ve karar verme algoritmaları için optimize edilmiş gömülü AI platformu. Herhangi bir robot gövdesine entegre edilebilir.',
      JSON.stringify({ 'İşlemci': 'Qualcomm RB5', 'NPU': '15 TOPS', 'RAM': '8 GB LPDDR5', 'Bağlantı': 'Wi-Fi 6E + BT 5.2 + 5G (opsiyonel)', 'IO': '40-pin GPIO + USB 3.0 + CAN Bus', 'OS': 'Linux + ROS2', 'Güç': '15W TDP' }),
      34000, null, 25, '/images/products/ai_kit.png', 0, 4.6, 19],
  ];

  for (const prod of products) {
    insertProduct.run(...prod);
  }

  // --- Reviews ---
  const insertReview = db.prepare(
    `INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)`
  );

  const sampleReviews = [
    [2, 1, 5, 'Mükemmel hassasiyet ve dayanıklılık. Üretim hattımızda 6 aydır sorunsuz çalışıyor.'],
    [2, 4, 5, 'Görüntü kalitesi inanılmaz. 4K 60fps ile çekimler profesyonel prodüksiyon kalitesinde.'],
    [2, 7, 4, 'Temizlik performansı çok iyi ama ilk harita oluşturma biraz uzun sürdü.'],
    [2, 9, 5, 'Çocuğum robotik ve kodlamaya bayıldı. Scratch ile başladı, şimdi Python öğreniyor!'],
    [2, 11, 5, 'Hayat değiştirici bir ürün. Biyonik elin hassasiyeti gerçekten etkileyici.'],
    [2, 15, 4, 'Depo verimliliğimiz %40 arttı. Filo yönetim yazılımı kullanışlı.'],
    [2, 18, 5, 'AI projelerine başlamak için mükemmel kit. Dokümantasyon çok detaylı.'],
  ];

  for (const rev of sampleReviews) {
    insertReview.run(...rev);
  }

  db.close();
  console.log('✅ Veritabanı seed işlemi tamamlandı.');
  console.log('   📧 Admin: ' + (process.env.ADMIN_EMAIL || 'admin@roboshop.com'));
  console.log('   🔑 Şifre: ' + (process.env.ADMIN_PASSWORD || 'Admin123!'));
  console.log('   📧 Demo: demo@roboshop.com / User123!');
}

seed();
