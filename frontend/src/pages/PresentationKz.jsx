import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Maximize2, Minimize2, Camera, Video, Zap, Shield, Wand2, Users, Layout, Clock, Settings as SettingsIcon, Brain, Database, Cloud, Code, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

const slides = [
    {
        id: 1,
        title: "CPU және GPU (CUDA) технологиялары негізінде 'қара-ақ' суреттерді түрлі түске өңдеу үдерісін зерттеу",
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
                    <span className="text-2xl text-blue-200 font-medium tracking-wide">Ахмет Ясауи Университеті • Емтихан Жобасы</span>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left w-full">
                    <motion.div
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                        className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-10 rounded-3xl border border-blue-500/20 backdrop-blur-md shadow-2xl transition-all"
                    >
                        <h4 className="text-blue-400 font-bold mb-8 flex items-center gap-3 text-2xl border-b border-blue-500/30 pb-4">
                            <Users className="w-8 h-8" /> Дайындағандар
                        </h4>
                        <ul className="space-y-6">
                            {[
                                { name: "Hinizov Ruslan", role: "Backend & AI Архитекторы" },
                                { name: "Isaev Nurbek", role: "Frontend & UI Дизайны" },
                                { name: "Taliphan Samat", role: "Модельдерді үйрету & Деректер" }
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
                                <Shield className="w-8 h-8" /> Жетекші
                            </h4>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl font-bold text-purple-300">A</div>
                                <div>
                                    <p className="text-2xl text-white font-bold">Касымбеков А.С</p>
                                    <p className="text-base text-purple-300 font-medium">Жоба Жетекшісі</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-900/40 to-slate-900/40 p-10 rounded-3xl border border-green-500/20 backdrop-blur-md shadow-2xl flex-1 hover:bg-green-900/30 transition-colors">
                            <div className="flex justify-between items-center h-full">
                                <div>
                                    <h4 className="text-green-400 font-bold mb-2 text-2xl">Топ</h4>
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
        title: "Жоба Туралы",
        content: (
            <div className="space-y-10 max-w-6xl mx-auto text-xl md:text-2xl leading-relaxed text-gray-200 text-left px-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <p>
                        <span className="text-blue-400 font-bold text-3xl">AYU ColorizeX</span>, жай ғана түстендіру құралы емес;
                        тарихи мұраны сақтайтын және естеліктерді жандандыратын <span className="text-purple-400 font-bold">Уақыт Машинасы</span>.
                    </p>
                    <p className="text-gray-300">
                        Бұл жүйе <span className="text-white font-bold bg-white/10 px-2 py-1 rounded">GAN (Generative Adversarial Network)</span> жасанды интеллект архитектурасын қолдана отырып,
                        ескі ақ-қара фотосуреттер мен видеоларды %100 автоматты түрде, бірнеше секунд ішінде фотореалистік түстермен қамтамасыз етеді.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-8 bg-gradient-to-br from-blue-900/30 to-slate-900/50 rounded-2xl border border-blue-500/30 shadow-xl"
                    >
                        <strong className="text-blue-400 block mb-4 text-3xl flex items-center gap-3"><Zap className="w-8 h-8" /> Миссиямыз</strong>
                        <p className="text-lg text-gray-300">
                            Жойылып бара жатқан көрнекі жадты ең соңғы жасанды интеллект технологияларымен қалпына келтіріп, келешек ұрпаққа ең жарқын күйінде, бұзылмаған қалпында жеткізу.
                        </p>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-8 bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-2xl border border-purple-500/30 shadow-xl"
                    >
                        <strong className="text-purple-400 block mb-4 text-3xl flex items-center gap-3"><Shield className="w-8 h-8" /> Көрінісіміз</strong>
                        <p className="text-lg text-gray-300">
                            Қымбат қалпына келтіру студияларының монополиясындағы технологияны қолжетімді етіп, әркімге бір ғана батырма арқылы кәсіби нәтиже алуға мүмкіндік беру.
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-slate-900 via-blue-900 to-slate-900"
    },
    {
        id: 3,
        title: "Мәселе және Шешім",
        content: (
            <div className="flex flex-col md:flex-row gap-10 justify-center items-stretch h-full w-full max-w-7xl px-4">
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    className="flex-1 p-10 bg-red-900/10 border border-red-500/30 rounded-3xl flex flex-col shadow-2xl backdrop-blur-sm"
                >
                    <h3 className="text-3xl font-bold text-red-400 mb-8 flex items-center gap-3 border-b border-red-500/20 pb-4">
                        <Shield className="w-10 h-10" /> Қазіргі Мәселелер
                    </h3>
                    <ul className="space-y-6 text-gray-200 flex-1 text-xl">
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Уақыт жоғалту</strong>
                                <span className="text-gray-400">Қолмен түстендіру (Photoshop т.б.) мамандар үшін де сағаттарды, ал видеолар үшін апталарды алады.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Қымбат құн</strong>
                                <span className="text-gray-400">Кәсіби қалпына келтіру қызметтері өте қымбат және баршаға қолжетімді емес.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-red-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-red-200 mb-1">Сапасыз нәтиже</strong>
                                <span className="text-gray-400">Қолжетімді тегін құралдар төмен сапалы нәтиже береді және видеоларда "діріл" тудырады.</span>
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
                        <Zap className="w-10 h-10" /> Біздің Шешім
                    </h3>
                    <ul className="space-y-6 text-gray-200 flex-1 text-xl">
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Толық автоматтандыру & Жылдамдық</strong>
                                <span className="text-gray-400">GAN архитектурасы арқылы қолмен араласусыз, секундтар ішінде нәтиже.</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Видео тұрақтылығы</strong>
                                <span className="text-gray-400">"NoGAN" оқытуы арқылы видеоларда кадрлар арасындағы үйлесімділік (Temporal Consistency).</span>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="text-green-500 font-bold text-2xl">•</span>
                            <div>
                                <strong className="block text-green-200 mb-1">Оңай Қолжетімділік</strong>
                                <span className="text-gray-400">Техникалық білімді қажет етпейтін, сүйреп апару сияқты қарапайым заманауи веб интерфейс.</span>
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
        title: "Басты Бет және Ерекшеліктер",
        content: (
            <div className="flex flex-col items-center gap-8 w-full max-w-7xl px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <div className="space-y-6">
                        <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            className="bg-blue-600/10 border-l-8 border-blue-500 p-8 rounded-r-2xl"
                        >
                            <h4 className="text-blue-400 font-bold text-3xl mb-3">Орталық Басқару Панелі</h4>
                            <p className="text-xl text-gray-300 leading-relaxed">
                                Күрделі мәзірлер жоқ. Пайдаланушылар жүйеге кірген бойда Фото, Видео және Тарих операцияларына бір орталықтан қол жеткізеді.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-indigo-600/10 border-l-8 border-indigo-500 p-8 rounded-r-2xl"
                        >
                            <h4 className="text-indigo-400 font-bold text-2xl mb-3">Сүйреп Апару</h4>
                            <p className="text-lg text-gray-300">
                                Файлдарыңызды жүктеп салу үшін аймаққа сүйреп апару жеткілікті. Жүйе форматты автоматты түрде анықтайды.
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
        title: "Өңдеу және Түзету",
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
                            <strong>Artistic Моделі:</strong> Фотосуреттер үшін жоғары деталь және қанық түстер. <br />
                            <strong>Stable Моделі:</strong> Видеолар үшін "NoGAN" арқылы дірілсіз (flicker-free) нәтижелер.
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
                            <h4 className="text-blue-400 font-bold text-2xl">Рендер Факторы</h4>
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed">
                            Өнімділік/Сапа тепе-теңдігі. Төмен фактор (10-20) жылдам нәтиже, Жоғары фактор (35-45) максималды деталь.
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
                            <h4 className="text-pink-400 font-bold text-2xl">Тікелей Салыстыру</h4>
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed">
                            Жұмыс аяқталған бойда, "Before/After" жүгіртпе құралымен нәтижені пиксельге дейін тексеріп, айырмашылықты көріңіз.
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
                        <span className="text-green-300 font-bold text-xl tracking-wide">GPU Белсенді</span>
                    </motion.div>
                </motion.div>
            </div>
        ),
        bg: "from-slate-900 via-purple-900 to-slate-900"
    },

    {
        id: 7,
        title: "CPU vs GPU: Жылдамдық Құпиясы",
        content: (
            <div className="flex flex-col items-center gap-16 w-full max-w-7xl px-4">
                <p className="text-3xl md:text-4xl text-gray-300 text-center max-w-6xl leading-normal">
                    Неліктен біз <strong className="text-blue-400">CPU</strong> емес, <strong className="text-green-400">GPU (CUDA)</strong> қолданамыз?
                    <br className="mb-4" />
                    Мұны <strong className="text-purple-400">"Суретші және Бүріккіш Армиясы"</strong> мысалымен түсіндірейік.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full mt-8">
                    {/* CPU Card */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 p-12 rounded-[2.5rem] border border-gray-600 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 left-0 w-full h-3 bg-gray-500"></div>
                        <div className="p-8 bg-gray-700/50 rounded-full mb-8 ring-8 ring-gray-600/30 group-hover:bg-blue-500/20 transition-colors">
                            <Users className="w-24 h-24 text-gray-300" />
                        </div>
                        <h4 className="text-5xl font-bold text-white mb-4">CPU</h4>
                        <div className="text-blue-300 font-medium mb-8 text-3xl">"Жалғыз Суретші"</div>
                        <p className="text-gray-300 text-2xl leading-relaxed">
                            Бір қылқаламмен салатын данышпан суретші. Өте ақылды, қиын есептерді шешеді, бірақ суретті <strong>пиксель-пиксель</strong>, кезекпен бояйды.
                            <br /><br />
                            <span className="text-red-400 font-bold block mt-4 text-3xl bg-red-900/30 py-2 rounded-xl border border-red-500/30">1 Сурет = 1 Минут</span>
                        </p>
                        <div className="absolute bottom-6 right-6 text-xl text-gray-500 font-mono font-bold tracking-widest opacity-60">СЕРИЯЛЫҚ ӨҢДЕУ</div>
                    </motion.div>

                    {/* GPU Card */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-gradient-to-br from-green-900/40 to-emerald-900/20 p-12 rounded-[2.5rem] border border-green-500/50 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ring-2 ring-green-500/30"
                    >
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-green-400 to-emerald-400"></div>
                        <div className="absolute -right-20 -top-20 w-60 h-60 bg-green-500/20 blur-[80px] rounded-full pointing-events-none animate-pulse"></div>

                        <div className="p-8 bg-green-500/20 rounded-full mb-8 ring-8 ring-green-500/20">
                            <Layout className="w-24 h-24 text-green-400" />
                        </div>
                        <h4 className="text-5xl font-bold text-white mb-4">GPU (CUDA)</h4>
                        <div className="text-green-300 font-medium mb-8 text-3xl">"Бүріккіш Армиясы"</div>
                        <p className="text-gray-200 text-2xl leading-relaxed">
                            10,000 бояу бүріккіші бар алып машина. "Боя!" деген бұйрық келгенде, <strong>барлығын бір сәтте</strong> бояйды.
                            <br /><br />
                            <span className="text-green-400 font-bold block mt-4 text-3xl bg-green-900/30 py-2 rounded-xl border border-green-500/30">1 Сурет = 3 Секунд</span>
                        </p>
                        <div className="absolute bottom-6 right-6 text-xl text-green-400 font-mono font-bold tracking-widest opacity-80">ПАРАЛЛЕЛЬ ӨҢДЕУ</div>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-gray-900 via-gray-800 to-black"
    },
    {
        id: 8,
        title: "Жандандыру: GAN Технологиясы",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <p className="text-2xl text-gray-300 text-center max-w-5xl">
                    <strong className="text-blue-400">GAN (Generative Adversarial Networks)</strong>, екі жасанды интеллекттің бір-бірімен бәсекелесіп үйренетін жүйесі.
                    Мұны <strong className="text-purple-400">"Жалған жасаушы және Детектив"</strong> хикаясы ретінде қарастыруға болады.
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
                        <h4 className="text-3xl font-bold text-white mb-2">Generator (Өндіруші)</h4>
                        <div className="text-blue-200 font-medium mb-6 text-lg">"Жалған жасаушы"</div>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Мақсаты - детективті алдау. Ақ-қара фотосуретті алып, оны соншалықты шынайы бояуға тырысады, детектив оның жасанды екенін түсінбей қалуы үшін.
                            <br /><br />
                            <span className="text-sm bg-blue-900/50 px-3 py-1 rounded text-blue-200 border border-blue-500/20">U-Net Архитектурасын Қолданады</span>
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
                        <h4 className="text-3xl font-bold text-white mb-2">Discriminator (Айырғыш)</h4>
                        <div className="text-red-200 font-medium mb-6 text-lg">"Детектив"</div>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Мақсаты - жалғанды ұстау. Алдына келген суреттің шын түсті фото ма, әлде Generator бояған сурет пе екенін болжайды.
                            <br /><br />
                            <span className="text-sm bg-red-900/50 px-3 py-1 rounded text-red-200 border border-red-500/20">ResNet Архитектурасын Қолданады</span>
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-slate-900 via-blue-950 to-slate-900"
    },
    {
        id: 9,
        title: "Тұрақтылық Құпиясы: 'NoGAN'",
        content: (
            <div className="flex flex-col items-center gap-12 w-full max-w-7xl px-4">
                <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-2xl w-full max-w-4xl text-center">
                    <h4 className="text-2xl font-bold text-red-400 mb-2">Классикалық GAN Мәселесі</h4>
                    <p className="text-gray-300 text-lg">
                        Классикалық GAN оқытуы тұрақсыз. Суреттерде бұзылулар болуы мүмкін және видеоларда әр кадр әртүрлі боялғандықтан, <strong>"діріл" (flickering)</strong> пайда болады.
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
                            <Zap className="w-8 h-8" /> NoGAN Шешімі
                        </h4>
                        <ul className="space-y-6 text-gray-200 text-lg">
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">1</span>
                                <div>
                                    <strong className="block text-green-200 mb-1">Алдын-ала Оқыту (Pre-Training)</strong>
                                    <span className="text-gray-400">Generator алдымен классикалық әдіспен (Feature Loss) оқытылып, "тәртіпті оқушы" сияқты мықты негізге ие болады.</span>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">2</span>
                                <div>
                                    <strong className="block text-green-200 mb-1">Қысқа Мерзімді Сын (Critique)</strong>
                                    <span className="text-gray-400">Тек соңғы кезеңде GAN (Жалған жасаушы vs Детектив) іске қосылады. Бұл суретке жан бітіреді, бірақ бұзылуына жол бермейді.</span>
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
                            <Video className="w-8 h-8" /> Видео Нәтижелері
                        </h4>
                        <p className="text-gray-300 text-xl leading-relaxed">
                            NoGAN арқасында біздің модель видеоларда <strong>Уақытша Үйлесімділікті (Temporal Consistency)</strong> қамтамасыз етеді.
                            <br /><br />
                            Яғни; бір кадрдағы түстер қандай болса, келесі кадрда да үйлесімді жалғасады. Осылайша, сол "түстердің жыпылықтауы" орын алмайды.
                        </p>
                    </motion.div>
                </div>
            </div>
        ),
        bg: "from-gray-900 via-indigo-950 to-black"
    },
    {
        id: 10,
        title: "Жоспарлар & Мүшелік",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <div className="grid grid-cols-3 gap-8 w-full text-left">
                    <motion.div whileHover={{ y: -10 }} className="bg-gray-800/60 p-8 rounded-2xl border border-gray-600 shadow-xl">
                        <h5 className="font-bold text-gray-300 text-3xl mb-2">Free Plan</h5>
                        <div className="text-4xl font-bold text-white mb-4">₸0<span className="text-base font-normal text-gray-500">/ай</span></div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• Стандартты Жылдамдық</li>
                            <li>• Су таңбасы бар нәтижелер</li>
                            <li>• Максимум 720p</li>
                        </ul>
                    </motion.div>
                    <motion.div whileHover={{ y: -10, scale: 1.05 }} className="bg-gradient-to-b from-yellow-900/40 to-yellow-900/20 p-8 rounded-2xl border border-yellow-500/50 shadow-2xl relative">
                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ҰСЫНЫЛАДЫ</div>
                        <h5 className="font-bold text-yellow-400 text-3xl mb-2">Pro Plan</h5>
                        <div className="text-4xl font-bold text-white mb-4">₸2900<span className="text-base font-normal text-gray-500">/ай</span></div>
                        <ul className="text-sm text-yellow-200/80 space-y-2">
                            <li>• <strong>GPU Жылдамдату</strong></li>
                            <li>• 4K Видео Қолдауы</li>
                            <li>• Су таңбасыз</li>
                            <li>• Басымдықты Қолдау</li>
                        </ul>
                    </motion.div>
                    <motion.div whileHover={{ y: -10 }} className="bg-indigo-900/40 p-8 rounded-2xl border border-indigo-500/50 shadow-xl">
                        <h5 className="font-bold text-indigo-400 text-3xl mb-2">Enterprise</h5>
                        <div className="text-4xl font-bold text-white mb-4">Ұсыныс<span className="text-base font-normal text-gray-500">/жеке</span></div>
                        <ul className="text-sm text-indigo-200/80 space-y-2">
                            <li>• Арнайы API Қолжетімдігі</li>
                            <li>• Жеке GPU Сервер</li>
                            <li>• Топтамалы (Batch) Өңдеу</li>
                            <li>• 7/24 SLA Қолдау</li>
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
        title: "Тарих & Деректерді Басқару",
        content: (
            <div className="flex flex-col items-center gap-10 w-full max-w-7xl px-4">
                <div className="w-full bg-green-900/20 border border-green-500/30 p-10 rounded-3xl text-left flex gap-8 items-center backdrop-blur-sm shadow-xl">
                    <div className="p-6 bg-green-500/20 rounded-full">
                        <Cloud className="w-16 h-16 text-green-400 flex-shrink-0" />
                    </div>
                    <div>
                        <h4 className="text-3xl font-bold text-white mb-4">Бұлтқа Негізделген Тұрақты Галерея</h4>
                        <p className="text-gray-200 text-xl leading-relaxed">
                            Пайдаланушыларымыздың еңбегі жоғалмайды. Өңделген әрбір фото және видео қауіпсіз серверлерімізде сақталады.
                            Пайдаланушылар қалаған құрылғыдан кіріп, тарихты сүзіп, кез келген уақытта жүктей алады.
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
        title: "Жекелендіру",
        content: (
            <div className="flex flex-col items-center w-full max-w-7xl px-4">
                <div className="flex gap-8 mb-12 text-center w-full text-gray-300">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="flex-1 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl"
                    >
                        <SettingsIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                        <h5 className="font-bold text-white text-2xl mb-2">Икемді Параметрлер</h5>
                        <p className="text-base text-gray-400">Тіл параметрлері (TR/EN/RU/KZ), Тақырып (Күңгірт/Ашық) және хабарландыруларды баптаңыз.</p>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="flex-1 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl"
                    >
                        <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h5 className="font-bold text-white text-2xl mb-2">Есептік Жазба Қауіпсіздігі</h5>
                        <p className="text-base text-gray-400">Құпия сөз әрекеттері, Несие бақылау және сессияны басқару сіздің қолыңызда.</p>
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
        title: "Біздің Команда",
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
        title: "Назарларыңызға Рахмет",
        subtitle: "Сұрақтарыңыз?",
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
                    <p className="text-4xl font-light text-white mb-6">Бізді тыңдағандарыңыз үшін рахмет.</p>
                    <p className="text-gray-400 text-2xl font-medium tracking-wide">AYU ColorizeX - Емтихан Жобасы 2025</p>
                </div>
                <div className="flex gap-8 mt-16">
                    <Link to="/" className="px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-full transition-all font-bold text-xl shadow-xl shadow-blue-500/40 flex items-center gap-3 hover:scale-110">
                        <Camera size={24} />
                        Қолданбаны Байқап Көріңіз
                    </Link>
                </div>
            </div>
        ),
        bg: "from-black via-gray-900 to-blue-950"
    }
];

export default function PresentationKz() {
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
                    <span className="font-bold">AYU ColorizeX (KZ)</span>
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    <span>{currentSlide + 1} / {slides.length}</span>
                </div>
                <div className="flex gap-3 pointer-events-auto">
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-black/20 backdrop-blur-sm" title="Толық экран (f)">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 bg-black/20 backdrop-blur-sm" title="Шығу">
                        <span className="text-xs font-bold">Шығу</span>
                    </Link>
                </div>
            </div>

            {/* Slide Content */}
            <div className="flex-1 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full h-full flex flex-col items-center justify-center text-center p-4 md:p-12 relative"
                    >
                        {slides[currentSlide].content}

                        <div className="absolute top-8 left-0 w-full text-center pointer-events-none">
                            <motion.h2
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70"
                            >
                                {slides[currentSlide].title}
                            </motion.h2>
                            {slides[currentSlide].subtitle && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-xl md:text-2xl text-blue-200 mt-2 font-light tracking-widest uppercase"
                                >
                                    {slides[currentSlide].subtitle}
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-50 bg-black/30 backdrop-blur-md px-6 py-3 rounded-full border border-white/5 shadow-2xl transition-opacity hover:opacity-100 opacity-90">
                <button
                    onClick={prevSlide}
                    className="p-3 bg-white/5 hover:bg-white/20 rounded-full transition-all group border border-white/5 hover:scale-110 active:scale-95"
                    aria-label="Previous Slide"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-300 group-hover:text-white" />
                </button>

                <div className="flex gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`transition-all duration-300 rounded-full ${currentSlide === index
                                ? 'w-8 h-2 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                : 'w-2 h-2 bg-gray-500/50 hover:bg-gray-400'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextSlide}
                    className="p-3 bg-white/5 hover:bg-white/20 rounded-full transition-all group border border-white/5 hover:scale-110 active:scale-95"
                    aria-label="Next Slide"
                >
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}
