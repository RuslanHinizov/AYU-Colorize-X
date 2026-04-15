import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Maximize2, Minimize2, Camera, Video, Zap, Shield, Wand2, Users, Layout, Clock, Settings as SettingsIcon, Brain, Database, Cloud, Code, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

const slides = [
    {
        id: 1,
        title: "Derin Öğrenmeyi Kullanarak Siyah-Beyaz Fotoğrafları Renklendirme Üreten Bir Sistem Oluşturma",
        subtitle: "AYU ColorizeX",
        content: (
            <div className="flex flex-col items-center z-10 w-full max-w-7xl px-4">
                <div className="relative mb-8 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <div className="relative w-56 h-56 rounded-full bg-black/30 flex items-center justify-center ring-4 ring-white/10 shadow-2xl backdrop-blur-md p-6">
                        <img
                            src="/LogoAndProFoto/ayu_logo.png"
                            alt="AYU ColorizeX Logo"
                            className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse"
                        />
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 px-10 py-4 rounded-full mb-12 shadow-lg hover:bg-white/10 transition-colors"
                >
                    <span className="text-2xl text-blue-200 font-medium tracking-wide">Ahmet Yesevi Üniversitesi • Sınav Projesi</span>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left w-full">
                    <motion.div
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                        className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-10 rounded-3xl border border-blue-500/20 backdrop-blur-md shadow-2xl transition-all"
                    >
                        <h4 className="text-blue-400 font-bold mb-8 flex items-center gap-3 text-2xl border-b border-blue-500/30 pb-4">
                            <Users className="w-8 h-8" /> Hazırlayanlar
                        </h4>
                        <ul className="space-y-6">
                            {[
                                { name: "Hinizov Ruslan", role: "Backend & AI Mimarı" },
                                { name: "Isaev Nurbek", role: "Frontend & UI Tasarım" },
                                { name: "Taliphan Samat", role: "Model Eğitimi & Veri" }
                            ].map((member, i) => (
                                <li key={i} className="flex items-center gap-4 text-gray-100 group">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-300 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xl">{member.name}</span>
                                        <span className="text-sm text-blue-300">{member.role}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 p-10 rounded-3xl border border-purple-500/20 backdrop-blur-md shadow-2xl flex-1 hover:bg-purple-900/30 transition-colors">
                            <h4 className="text-purple-400 font-bold mb-6 flex items-center gap-3 text-2xl border-b border-purple-500/30 pb-4">
                                <Shield className="w-8 h-8" /> Danışman
                            </h4>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl font-bold text-purple-300">A</div>
                                <div>
                                    <p className="text-2xl text-white font-bold">Amanov Anuarbek</p>
                                    <p className="text-base text-purple-300 font-medium">Proje Danışmanı</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-900/40 to-slate-900/40 p-10 rounded-3xl border border-green-500/20 backdrop-blur-md shadow-2xl flex-1 hover:bg-green-900/30 transition-colors">
                            <div className="flex justify-between items-center h-full">
                                <div>
                                    <h4 className="text-green-400 font-bold mb-2 text-2xl">Grup</h4>
                                    <p className="text-5xl text-white font-black tracking-widest drop-shadow-lg">AKI-211</p>
                                </div>
                                <div className="h-24 w-24 opacity-20">
                                    <Users className="w-full h-full" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-slate-950 via-indigo-950 to-slate-950"
    },
    {
        id: 2,
        title: "Proje Hakkında",
        content: (
            <div className="space-y-10 max-w-6xl mx-auto text-xl md:text-2xl leading-relaxed text-gray-200 text-left px-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <p>
                        <span className="text-blue-400 font-bold text-3xl">AYU ColorizeX</span>, sadece bir renklendirme aracı değil;
                        tarihi mirası koruyan ve anıları canlandıran bir <span className="text-purple-400 font-bold">Zaman Makinesi</span>dir.
                    </p>
                    <p className="text-gray-300">
                        Bu sistem, <span className="text-white font-bold bg-white/10 px-2 py-1 rounded">GAN (Generative Adversarial Network)</span> yapay zeka mimarisini kullanarak,
                        eski siyah-beyaz fotoğrafları ve videoları %100 otomatik olarak, saniyeler içinde fotogerçekçi renklerle buluşturur.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-8 bg-gradient-to-br from-blue-900/30 to-slate-900/50 rounded-2xl border border-blue-500/30 shadow-xl"
                    >
                        <strong className="text-blue-400 block mb-4 text-3xl flex items-center gap-3"><Zap className="w-8 h-8" /> Misyonumuz</strong>
                        <p className="text-lg text-gray-300">
                            Kaybolmaya yüz tutmuş görsel belleği, en son yapay zeka teknolojileriyle restore ederek gelecek nesillere en canlı haliyle, bozulmadan aktarmak.
                        </p>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-8 bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-2xl border border-purple-500/30 shadow-xl"
                    >
                        <strong className="text-purple-400 block mb-4 text-3xl flex items-center gap-3"><Shield className="w-8 h-8" /> Vizyonumuz</strong>
                        <p className="text-lg text-gray-300">
                            Pahalı restorasyon stüdyolarının tekelinde olan teknolojiyi demokratikleştirerek, herkesin tek tıkla profesyonel sonuçlar alabilmesini sağlamak.
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-slate-900 via-blue-900 to-slate-900"
    },
    {
        id: 3,
        title: "Problem & Çözüm",
        content: (
            <div className="flex flex-col md:flex-row gap-10 justify-center items-stretch h-full w-full max-w-7xl px-4">
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    className="flex-1 p-10 bg-red-900/10 border border-red-500/30 rounded-3xl flex flex-col shadow-2xl backdrop-blur-sm"
                >
                    <h3 className="text-3xl font-bold text-red-400 mb-8 flex items-center gap-3 border-b border-red-500/20 pb-4">
                        <Shield className="w-10 h-10" /> Mevcut Problemler
                    </h3>
                    <ul className="space-y-6 text-gray-200 flex-1 text-xl">
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Zaman Kaybı</strong>
                                <span className="text-gray-400">Manuel renklendirme (Photoshop vb.) uzmanlar için bile saatler, videolar için haftalar sürer.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Yüksek Maliyet</strong>
                                <span className="text-gray-400">Profesyonel restorasyon hizmetleri çok pahalıdır ve herkesin erişimine açık değildir.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Yetersiz Kalite</strong>
                                <span className="text-gray-400">Mevcut ücretsiz araçlar düşük çözünürlüklü sonuçlar verir ve videolarda "titreme" yapar.</span>
                            </div>
                        </li>
                    </ul>
                </motion.div>

                <div className="hidden md:flex items-center text-gray-500/50">
                    <ChevronRight size={64} className="animate-pulse" />
                </div>

                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    className="flex-1 p-10 bg-green-900/10 border border-green-500/30 rounded-3xl flex flex-col shadow-2xl backdrop-blur-sm"
                >
                    <h3 className="text-3xl font-bold text-green-400 mb-8 flex items-center gap-3 border-b border-green-500/20 pb-4">
                        <Zap className="w-10 h-10" /> Bizim Çözümümüz
                    </h3>
                    <ul className="space-y-6 text-gray-200 flex-1 text-xl">
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Tam Otomasyon & Hız</strong>
                                <span className="text-gray-400">GAN mimarisi ile manuel müdahale gerekmeden saniyeler içinde sonuç.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Video Stabilitesi</strong>
                                <span className="text-gray-400">"NoGAN" eğitimi sayesinde videolarda kareler arası tutarlılık (Temporal Consistency).</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Kolay Erişim</strong>
                                <span className="text-gray-400">Teknik bilgi gerektirmeyen, sürükle-bırak kadar basit modern web arayüzü.</span>
                            </div>
                        </li>
                    </ul>
                </motion.div>
            </div>
        ),
        bg: "from-gray-900 to-gray-800"
    },
    {
        id: 4,
        title: "Ana Sayfa & Özellikler",
        content: (
            <div className="flex flex-col items-center gap-8 w-full max-w-7xl px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <div className="space-y-6">
                        <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            className="bg-blue-600/10 border-l-8 border-blue-500 p-8 rounded-r-2xl"
                        >
                            <h4 className="text-blue-400 font-bold text-3xl mb-3">Merkezi Kontrol Paneli</h4>
                            <p className="text-xl text-gray-300 leading-relaxed">
                                Karmaşık menüler yok. Kullanıcılar sisteme girdikleri anda Fotoğraf, Video ve Geçmiş işlemlerine tek bir merkezden erişir.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-indigo-600/10 border-l-8 border-indigo-500 p-8 rounded-r-2xl"
                        >
                            <h4 className="text-indigo-400 font-bold text-2xl mb-3">Sürükle & Bırak</h4>
                            <p className="text-lg text-gray-300">
                                Dosyalarınızı yüklemek için alanın içine sürüklemeniz yeterli. Sistem formatı otomatik algılar.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative w-full h-[500px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl group"
                    >
                        <div className="absolute top-4 left-4 z-20 flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        </div>
                        <img
                            src="/presentation_images/home.png"
                            alt="Home Page"
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-950 via-gray-900/50 to-transparent"></div>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-blue-950 via-slate-900 to-blue-950"
    },
    {
        id: 5,
        title: "İşleme & Düzenleme",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-purple-500/10 border border-purple-500/20 p-8 rounded-3xl backdrop-blur-sm hover:bg-purple-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <Brain className="w-10 h-10 text-purple-400" />
                            <h4 className="text-purple-400 font-bold text-2xl">Artistic vs Stable</h4>
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed">
                            <strong>Artistic Mod:</strong> Fotoğraflar için yüksek detay ve canlı renkler. <br />
                            <strong>Stable Mod:</strong> Videolar için "NoGAN" ile titremesiz (flicker-free) sonuçlar.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-3xl backdrop-blur-sm hover:bg-blue-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <SettingsIcon className="w-10 h-10 text-blue-400" />
                            <h4 className="text-blue-400 font-bold text-2xl">Render Faktörü</h4>
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed">
                            Performans/Kalite dengesi. Düşük faktör (10-20) hızlı sonuç, Yüksek faktör (35-45) maksimum detay.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-pink-500/10 border border-pink-500/20 p-8 rounded-3xl backdrop-blur-sm hover:bg-pink-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <Layout className="w-10 h-10 text-pink-400" />
                            <h4 className="text-pink-400 font-bold text-2xl">Canlı Kıyaslama</h4>
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed">
                            İşlem bittiği an, "Before/After" slider aracı ile sonucu piksel piksel inceleyin ve farkı görün.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl group ring-1 ring-white/10 bg-black/50"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none"></div>
                    <img
                        src="/presentation_images/editor.png"
                        alt="Editor Interface"
                        className="w-full h-full object-contain bg-slate-900/50 transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Floating Badge Animation */}
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="absolute bottom-10 right-10 z-20 bg-green-500/20 backdrop-blur-2xl border border-green-500/40 px-8 py-4 rounded-full flex items-center gap-4 shadow-xl"
                    >
                        <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                        <span className="text-green-300 font-bold text-xl tracking-wide">GPU Aktif</span>
                    </motion.div>
                </motion.div>
            </div>
        ),
        bg: "from-slate-900 via-purple-900 to-slate-900"
    },


    {
        id: 8,
        title: "Canlandırma: GAN Teknolojisi",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <p className="text-2xl text-gray-300 text-center max-w-5xl">
                    <strong className="text-blue-400">GAN (Generative Adversarial Networks)</strong>, iki yapay zekanın birbiriyle rekabet ederek öğrendiği bir sistemdir.
                    Bunu bir <strong className="text-purple-400">"Kalpazan ve Dedektif"</strong> hikayesi olarak düşünebiliriz.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full mt-4">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-10 rounded-3xl border border-blue-500/30 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                        <div className="p-4 bg-blue-500/20 rounded-full mb-6 ring-4 ring-blue-500/10">
                            <Wand2 className="w-16 h-16 text-blue-400" />
                        </div>
                        <h4 className="text-3xl font-bold text-white mb-2">Generator (Üretici)</h4>
                        <div className="text-blue-200 font-medium mb-6 text-lg">"Kalpazan"</div>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Amacı dedektifi kandırmaktır. Siyah-beyaz fotoğrafı alır ve onu o kadar gerçekçi boyamaya çalışır ki, dedektif onun yapay olduğunu anlamasın.
                            <br /><br />
                            <span className="text-sm bg-blue-900/50 px-3 py-1 rounded text-blue-200 border border-blue-500/20">U-Net Mimarisi Kullanır</span>
                        </p>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-red-900/20 to-red-800/10 p-10 rounded-3xl border border-red-500/30 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-orange-400"></div>
                        <div className="p-4 bg-red-500/20 rounded-full mb-6 ring-4 ring-red-500/10">
                            <Shield className="w-16 h-16 text-red-500" />
                        </div>
                        <h4 className="text-3xl font-bold text-white mb-2">Discriminator (Ayırt Edici)</h4>
                        <div className="text-red-200 font-medium mb-6 text-lg">"Dedektif"</div>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Amacı sahteyi yakalamaktır. Önüne gelen resmin gerçek bir renkli fotoğraf mı, yoksa Generator'ın boyadığı bir resim mi olduğunu tahmin eder.
                            <br /><br />
                            <span className="text-sm bg-red-900/50 px-3 py-1 rounded text-red-200 border border-red-500/20">ResNet Mimarisi Kullanır</span>
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-slate-900 via-blue-950 to-slate-900"
    },
    {
        id: 9,
        title: "Kararlılık Sırrı: 'NoGAN'",
        content: (
            <div className="flex flex-col items-center gap-12 w-full max-w-7xl px-4">
                <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-2xl w-full max-w-4xl text-center">
                    <h4 className="text-2xl font-bold text-red-400 mb-2">Klasik GAN Sorunu</h4>
                    <p className="text-gray-300 text-lg">
                        Klasik GAN eğitimi kararsızdır. Resimlerde bozulmalar olabilir ve videolarda her kare farklı boyandığı için <strong>"titreme" (flickering)</strong> oluşur.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute left-1/2 -ml-0.5 w-0.5 h-16 bg-gradient-to-b from-red-500/50 to-green-500/50 -top-16"></div>
                    <ChevronRight className="w-12 h-12 text-white rotate-90 mx-auto mb-4" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 p-8 rounded-3xl border border-green-500/30 shadow-xl"
                    >
                        <h4 className="text-3xl font-bold text-green-400 mb-6 flex items-center gap-3">
                            <Zap className="w-8 h-8" /> NoGAN Çözümü
                        </h4>
                        <ul className="space-y-6 text-gray-200 text-lg">
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">1</span>
                                <div>
                                    <strong className="block text-green-200 mb-1">Ön Eğitim (Pre-Training)</strong>
                                    <span className="text-gray-400">Generator önce klasik yöntemle (Feature Loss) eğitilerek "uslu bir öğrenci" gibi sağlam bir temel kazanır.</span>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">2</span>
                                <div>
                                    <strong className="block text-green-200 mb-1">Kısa Süreli Kritik (Critique)</strong>
                                    <span className="text-gray-400">Sadece son aşamada GAN (Kalpazan vs Dedektif) devreye girer. Bu, resme canlılık katar ama bozulmasına izin vermez.</span>
                                </div>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col justify-center"
                    >
                        <h4 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-3">
                            <Video className="w-8 h-8" /> Video Sonuçları
                        </h4>
                        <p className="text-gray-300 text-xl leading-relaxed">
                            NoGAN sayesinde modelimiz videolarda <strong>Zamansal Tutarlılık (Temporal Consistency)</strong> sağlar.
                            <br /><br />
                            Yani; bir karedeki renkler neyse, sonraki karede de uyumlu devam eder. Böylece o rahatsız edici "renk yanıp sönmesi" yaşanmaz.
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-gray-900 via-indigo-950 to-black"
    },
    {
        id: 10,
        title: "İş Planları & Üyelik",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <div className="grid grid-cols-3 gap-8 w-full text-left">
                    <motion.div whileHover={{ y: -10 }} className="bg-gray-800/60 p-8 rounded-2xl border border-gray-600 shadow-xl">
                        <h5 className="font-bold text-gray-300 text-3xl mb-2">Free Plan</h5>
                        <div className="text-4xl font-bold text-white mb-4">₺0<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• Standart Hız</li>
                            <li>• Filigranlı Sonuçlar</li>
                            <li>• Maksimum 720p</li>
                        </ul>
                    </motion.div>
                    <motion.div whileHover={{ y: -10, scale: 1.05 }} className="bg-gradient-to-b from-yellow-900/40 to-yellow-900/20 p-8 rounded-2xl border border-yellow-500/50 shadow-2xl relative">
                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ÖNERİLEN</div>
                        <h5 className="font-bold text-yellow-400 text-3xl mb-2">Pro Plan</h5>
                        <div className="text-4xl font-bold text-white mb-4">₺199<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="text-sm text-yellow-200/80 space-y-2">
                            <li>• <strong>GPU Hızlandırma</strong></li>
                            <li>• 4K Video Desteği</li>
                            <li>• Filigransız</li>
                            <li>• Öncelikli Destek</li>
                        </ul>
                    </motion.div>
                    <motion.div whileHover={{ y: -10 }} className="bg-indigo-900/40 p-8 rounded-2xl border border-indigo-500/50 shadow-xl">
                        <h5 className="font-bold text-indigo-400 text-3xl mb-2">Enterprise</h5>
                        <div className="text-4xl font-bold text-white mb-4">Teklif<span className="text-base font-normal text-gray-500">/bireysel</span></div>
                        <ul className="text-sm text-indigo-200/80 space-y-2">
                            <li>• Özel API Erişimi</li>
                            <li>• Dedicated GPU Server</li>
                            <li>• Toplu (Batch) İşleme</li>
                            <li>• 7/24 SLA Destek</li>
                        </ul>
                    </motion.div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="relative w-full max-w-5xl h-[450px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl group"
                >
                    <img
                        src="/presentation_images/plans.png"
                        alt="Plans Page"
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                </motion.div>
            </div>
        ),
        bg: "from-purple-950 via-gray-900 to-purple-950"
    },
    {
        id: 11,
        title: "Geçmiş & Veri Yönetimi",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <div className="w-full bg-green-900/20 border border-green-500/30 p-10 rounded-3xl text-left flex gap-8 items-center backdrop-blur-sm shadow-xl">
                    <div className="p-6 bg-green-500/20 rounded-full">
                        <Cloud className="w-16 h-16 text-green-400 flex-shrink-0" />
                    </div>
                    <div>
                        <h4 className="text-3xl font-bold text-white mb-4">Bulut Tabanlı Daimi Galeri</h4>
                        <p className="text-gray-200 text-xl leading-relaxed">
                            Kullanıcılarımızın emekleri kaybolmaz. İşlenen her fotoğraf ve video, güvenli sunucularımızda saklanır.
                            Kullanıcılar istedikleri cihazdan erişebilir, geçmişi filtreleyebilir ve diledikleri zaman indirebilirler.
                        </p>
                    </div>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-[500px] rounded-3xl overflow-hidden border-2 border-green-500/20 shadow-2xl group"
                >
                    <img
                        src="/presentation_images/history.png"
                        alt="History Page"
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-green-950/80 to-transparent"></div>
                </motion.div>
            </div>
        ),
        bg: "from-gray-900 via-green-950 to-gray-900"
    },
    {
        id: 12,
        title: "Kişiselleştirme",
        content: (
            <div className="flex flex-col items-center w-full max-w-7xl px-4">
                <div className="flex gap-8 mb-12 text-center w-full text-gray-300">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="flex-1 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl"
                    >
                        <SettingsIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                        <h5 className="font-bold text-white text-2xl mb-2">Esnek Ayarlar</h5>
                        <p className="text-base text-gray-400">Dil seçenekleri (TR/EN), Tema (Koyu/Açık) ve bildirimleri özelleştirin.</p>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="flex-1 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl"
                    >
                        <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h5 className="font-bold text-white text-2xl mb-2">Hesap Güvenliği</h5>
                        <p className="text-base text-gray-400">Şifre işlemleri, Kredi takibi ve oturum yönetimi parmaklarınızın ucunda.</p>
                    </motion.div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="relative w-full h-[500px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl group"
                >
                    <img
                        src="/presentation_images/settings.png"
                        alt="Settings Page"
                        className="w-full h-full object-contain bg-slate-800 p-8 transition-transform duration-700 group-hover:scale-105"
                    />
                </motion.div>
            </div>
        ),
        bg: "from-slate-900 to-slate-800"
    },
    {
        id: 13,
        title: "Ekibimiz",
        content: (
            <div className="flex flex-col items-center w-full max-w-7xl px-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    className="relative w-full h-[500px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl group mb-12"
                >
                    <img
                        src="/presentation_images/team.png"
                        alt="Team Page"
                        className="w-full h-full object-contain bg-slate-900 transition-transform duration-700 group-hover:scale-105"
                    />
                </motion.div>
                <div className="grid grid-cols-2 gap-12 w-full max-w-4xl">
                    <div className="flex flex-col items-center text-center p-8 bg-blue-900/20 rounded-3xl border border-blue-500/30 backdrop-blur-md">
                        <div className="p-4 bg-blue-500/20 rounded-full mb-4">
                            <Users className="w-10 h-10 text-blue-400" />
                        </div>
                        <span className="text-white font-bold text-2xl mb-2">Hinizov & Isaev</span>
                        <span className="text-blue-300 text-lg">Full Stack & UI/UX</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-8 bg-purple-900/20 rounded-3xl border border-purple-500/30 backdrop-blur-md">
                        <div className="p-4 bg-purple-500/20 rounded-full mb-4">
                            <Wand2 className="w-10 h-10 text-purple-400" />
                        </div>
                        <span className="text-white font-bold text-2xl mb-2">Taliphan Samat</span>
                        <span className="text-purple-300 text-lg">AI Model Research</span>
                    </div>
                </div>
            </div>
        ),
        bg: "from-blue-950 to-black"
    },
    {
        id: 14,
        title: "Teşekkürler",
        subtitle: "Sorularınız?",
        content: (
            <div className="flex flex-col items-center">
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="text-9xl mb-12 drop-shadow-2xl"
                >
                    👋
                </motion.div>
                <div className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 max-w-4xl shadow-2xl">
                    <p className="text-4xl font-light text-white mb-6">Bizi dinlediğiniz için teşekkür ederiz.</p>
                    <p className="text-gray-400 text-2xl font-medium tracking-wide">AYU ColorizeX - Sınav Projesi 2025</p>
                </div>
                <div className="flex gap-8 mt-16">
                    <Link to="/" className="px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-full transition-all font-bold text-xl shadow-xl shadow-blue-500/40 flex items-center gap-3 hover:scale-110">
                        <Camera size={24} />
                        Uygulamayı Dene
                    </Link>
                </div>
            </div>
        ),
        bg: "from-black via-gray-900 to-blue-950"
    }
];

export default function Presentation() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'f') toggleFullscreen();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlide]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className={`w-full h-screen overflow-hidden bg-gradient-to-br ${slides[currentSlide].bg} text-white transition-colors duration-1000 flex flex-col`}>
            {/* Header / Controls */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
                <div className="text-xs md:text-sm font-light opacity-50 flex items-center gap-2 pointer-events-auto bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span className="font-bold">AYU ColorizeX</span>
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    <span>{currentSlide + 1} / {slides.length}</span>
                </div>
                <div className="flex gap-3 pointer-events-auto">
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-black/20 backdrop-blur-sm" title="Tam Ekran (f)">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-black/20 backdrop-blur-sm" title="Çıkış">
                        <span className="text-xs font-bold">Çıkış</span>
                    </Link>
                </div>
            </div>

            {/* Slide Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="w-full max-w-[90rem] text-center h-full flex flex-col justify-center items-center"
                    >
                        <motion.h1
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight drop-shadow-2xl px-4"
                        >
                            {slides[currentSlide].title}
                        </motion.h1>
                        {slides[currentSlide].subtitle && (
                            <motion.h2
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="text-xl md:text-3xl lg:text-4xl text-gray-300 font-light mb-8 tracking-wide"
                            >
                                {slides[currentSlide].subtitle}
                            </motion.h2>
                        )}

                        <div className="w-full flex justify-center flex-1 items-center px-4 md:px-0">
                            {slides[currentSlide].content}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Bar - Compact & Floating */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50 bg-black/30 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                <button
                    onClick={prevSlide}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/20 transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                    disabled={currentSlide === 0}
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex gap-2">
                    {slides.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextSlide}
                    className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all hover:scale-110 active:scale-95"
                >
                    {currentSlide === slides.length - 1 ? <span className="text-xs font-bold px-2">Bitti</span> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* Background Particles/Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none delay-1000"></div>
        </div>
    );
}
