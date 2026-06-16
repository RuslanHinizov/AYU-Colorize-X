import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ArrowRight, Zap, Brain, ChevronLeft,
  Video, Camera, Scissors, Eraser, Wand2, Maximize2,
  CheckCircle, Globe, Shield, Star, Layers, Code, Home
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Before / After Slider ──────────────────────────────────────── */
function BeforeAfter({ before, after }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const updatePos = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-col-resize rounded-2xl overflow-hidden"
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX); }}
      onMouseMove={(e) => { if (dragging.current) updatePos(e.clientX); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => { dragging.current = true; updatePos(e.touches[0].clientX); }}
      onTouchMove={(e) => { if (dragging.current) updatePos(e.touches[0].clientX); }}
      onTouchEnd={() => { dragging.current = false; }}
    >
      {/* AFTER — full base */}
      <img src={after} alt="after" draggable={false}
        className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none" />

      {/* BEFORE — clipped via clipPath so the image itself is always full size */}
      <img src={before} alt="before" draggable={false}
        className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />

      {/* Divider line + handle */}
      <div className="absolute top-0 bottom-0 z-10 pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
        <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)]" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-2xl flex items-center justify-center text-gray-700 text-sm font-black pointer-events-auto cursor-col-resize select-none">
          ⇔
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/75 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide pointer-events-none">
        Бұрын
      </span>
      <span className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-blue-600/90 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide pointer-events-none">
        Кейін
      </span>
    </div>
  );
}

/* ─── Count-Up ────────────────────────────────────────────────────── */
function CountUp({ to, suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const total = Math.round(duration * 60);
    const tick = () => {
      frame++;
      const progress = frame / total;
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.min(Math.round(eased * to), to));
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Floating orb ───────────────────────────────────────────────── */
function Orb({ color, style, animate }) {
  return (
    <motion.div
      animate={animate}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
      className={`absolute rounded-full blur-[100px] pointer-events-none ${color}`}
      style={style}
    />
  );
}

/* ─── Section label ──────────────────────────────────────────────── */
function Tag({ color = 'text-blue-600', children }) {
  return (
    <span className={`font-mono text-xs uppercase tracking-[0.2em] font-semibold ${color}`}>
      {children}
    </span>
  );
}

/* ─── Model card ─────────────────────────────────────────────────── */
function ModelCard({ icon: Icon, name, kzName, desc, tag, gradient, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-md shadow-gray-200/80 border border-gray-100/80 group cursor-default"
    >
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">{tag}</p>
      <h3 className="font-bold text-gray-900 text-base mb-0.5">{name}</h3>
      <p className="text-[11px] font-semibold text-blue-600 mb-2">{kzName}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function Presentation() {
  const [playing, setPlaying] = useState(false);
  const v1bRef = useRef(null);
  const v1aRef = useRef(null);
  const v2bRef = useRef(null);
  const v2aRef = useRef(null);

  const toggleVideo = () => {
    setPlaying((p) => {
      const next = !p;
      [v1bRef, v1aRef, v2bRef, v2aRef].forEach((r) => {
        if (!r.current) return;
        next ? r.current.play().catch(() => {}) : r.current.pause();
      });
      return next;
    });
  };

  const models = [
    {
      icon: Camera, name: 'DDColor', kzName: 'Фотосуретті бояу',
      desc: 'Transformer + U-Net архитектурасы. Lab түс кеңістігінде қара-ақ суреттерді нақты түске айналдырады.',
      tag: 'Фото бояу', gradient: 'from-blue-500 to-indigo-600', delay: 0,
    },
    {
      icon: Video, name: 'DeOldify', kzName: 'Видеоны бояу',
      desc: 'GAN негізіндегі модель. Видеоны кадрларға бөліп, бояп, қайта біріктіреді. Толық офлайн.',
      tag: 'Видео бояу', gradient: 'from-emerald-500 to-teal-600', delay: 0.05,
    },
    {
      icon: Wand2, name: 'SDXL Inpainting', kzName: 'Фото жөндеу',
      desc: 'Stable Diffusion XL. Зақымдалған аймақты автоматты анықтап, AI жасайды. 40 қадам.',
      tag: 'Зақым қалпына келтіру', gradient: 'from-violet-500 to-purple-600', delay: 0.1,
    },
    {
      icon: Brain, name: 'CodeFormer', kzName: 'Жүзді қалпына келтіру',
      desc: 'VQGAN + Transformer. Ескі бұлыңғыр жүздерді жоғары сапада қалпына келтіреді.',
      tag: 'Жүз қалпына келтіру', gradient: 'from-cyan-500 to-blue-600', delay: 0.15,
    },
    {
      icon: Maximize2, name: 'Real-ESRGAN', kzName: 'Суперрезолюция',
      desc: 'RRDB архитектурасы. 4x және 8x өлшем үлкейту, пикселдерді жоғалтпай.',
      tag: 'Өлшемді үлкейту', gradient: 'from-amber-500 to-orange-600', delay: 0.2,
    },
    {
      icon: Scissors, name: 'U2-Net / rembg', kzName: 'Фонды жою',
      desc: '2-деңгейлі U-Net сегментация. Алдыңғы жоспарды дәл анықтап, фонды жояды.',
      tag: 'Фон жою', gradient: 'from-green-500 to-emerald-600', delay: 0.25,
    },
    {
      icon: Eraser, name: 'LaMa', kzName: 'Объектіні жою',
      desc: 'Large Mask Inpainting. Белгіленген нысанды тігіссіз жойып, фонмен толтырады.',
      tag: 'Объект жою', gradient: 'from-rose-500 to-red-600', delay: 0.3,
    },
  ];

  const results = [
    { to: 7, suffix: '', label: 'AI Моделі', sub: 'Бір платформада', gradient: 'from-blue-600 to-indigo-600' },
    { to: 6, suffix: '', label: 'Функция', sub: 'Іске қосылған', gradient: 'from-violet-600 to-purple-600' },
    { to: 4, suffix: '', label: 'Тіл', sub: 'Қаз · Рус · Ағыл · Тур', gradient: 'from-emerald-600 to-teal-600' },
    { to: 100, suffix: '%', label: 'Офлайн', sub: 'Интернетсіз жұмыс', gradient: 'from-amber-500 to-orange-500' },
  ];

  const techStack = [
    { layer: 'Frontend', items: ['React 18', 'Vite', 'TailwindCSS', 'Framer Motion', 'Zustand'], color: 'bg-blue-500' },
    { layer: 'Backend', items: ['FastAPI', 'Python 3.10', 'Celery', 'Redis', 'SQLite / PostgreSQL'], color: 'bg-emerald-500' },
    { layer: 'AI / ML', items: ['PyTorch', 'Diffusers (HF)', 'basicsr', 'rembg', 'OpenCV', 'NAFNet'], color: 'bg-violet-500' },
    { layer: 'DevOps', items: ['Docker', 'Nginx', 'Git', 'GitHub'], color: 'bg-amber-500' },
  ];

  return (
    <div className="bg-white" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ══════════════════════════════════════════════════════ */}
      {/* HERO                                                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#03071E]">

        {/* ── Background video ── */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          src="/demo/video/d055a877-801c-4f2a-a9f2-5b2103260f44_video_colorize.mp4"
        />
        {/* Dark gradient overlay — keeps text readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03071E]/70 via-[#03071E]/50 to-[#03071E]/90" />

        {/* Animated gradient orbs on top of video */}
        <Orb color="w-[700px] h-[700px] bg-blue-700/30" style={{ top: '-10%', left: '-10%' }}
          animate={{ x: [0, 80, 0], y: [0, -40, 0] }} />
        <Orb color="w-[600px] h-[600px] bg-violet-700/20" style={{ bottom: '-5%', right: '-5%' }}
          animate={{ x: [0, -60, 0], y: [0, 50, 0] }} />

        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto w-full">
          {/* University logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-10"
          >
            <img
              src="/LogoAndProFoto/ayu_logo.png"
              alt="AYU ColorizeX"
              className="h-32 object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Title — bigger */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-black leading-none tracking-tight"
          >
            <span className="block text-white text-7xl md:text-[8rem] lg:text-[8.5rem]">AYU</span>
            <span className="block text-7xl md:text-[8rem] lg:text-[8.5rem] bg-gradient-to-r from-blue-400 via-violet-400 to-blue-300 bg-clip-text text-transparent">
              ColorizeX
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mt-8 mb-12 text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Ескі фотосуреттер мен видеоларды жасанды интеллект арқылы автоматты қалпына келтіру платформасы
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-center justify-center gap-12 md:gap-20 mb-14"
          >
            {[
              { v: '7', l: 'AI Моделі' },
              { v: '6', l: 'Функция' },
              { v: '4', l: 'Тіл' },
              { v: '100%', l: 'Офлайн' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-5xl md:text-6xl font-black text-white">{s.v}</div>
                <div className="text-xs text-white/55 mt-2 uppercase tracking-widest font-mono font-semibold">{s.l}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/photo"
              className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all duration-200 hover:scale-105 shadow-2xl shadow-blue-600/40 flex items-center gap-2"
            >
              Жүйені ашу <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-4 border border-white/20 bg-white/8 backdrop-blur-sm text-white rounded-2xl font-bold text-lg hover:bg-white/15 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" /> Демо
            </button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/15 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2.5 rounded-full bg-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TEAM & DIPLOMA INFO                                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#03071E] relative overflow-hidden">
        <Orb color="w-[500px] h-[500px] bg-blue-700/10" style={{ top: '-20%', left: '-10%' }}
          animate={{ x: [0, 50, 0] }} />
        <Orb color="w-[400px] h-[400px] bg-violet-700/10" style={{ bottom: '-10%', right: '-5%' }}
          animate={{ y: [0, -40, 0] }} />

        <div className="relative z-10 max-w-6xl mx-auto">

          {/* ── Diploma info card ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 rounded-3xl border border-white/20 bg-white/8 backdrop-blur-sm overflow-hidden"
          >
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/15">
              {/* Left — project info */}
              <div className="p-8">
                <p className="text-xs font-mono text-blue-300 uppercase tracking-widest mb-4 font-semibold">Дипломдық жоба</p>
                <h3 className="text-white font-bold text-lg leading-snug mb-6">
                  Жасанды интеллект технологиялары негізінде ескі және қара-ақ суреттер мен видеоларды жаңарту және түсті қалпына келтіру жүйесін əзірлеу
                </h3>
                <div className="space-y-3">
                  {[
                    { l: 'Факультет', v: 'B057 — Ақпараттық технологиялар' },
                    { l: 'Мамандық', v: '6B06182 — Компьютерлік инженерия' },
                    { l: 'Топ',      v: 'АКИ-211  •  4 курс' },
                    { l: 'Жыл',      v: '2025–2026  •  16.06.2026' },
                  ].map((row) => (
                    <div key={row.l} className="flex gap-3 text-sm">
                      <span className="text-white/60 w-24 shrink-0 font-medium">{row.l}</span>
                      <span className="text-white font-semibold">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right — supervisor */}
              <div className="p-8 flex flex-col justify-center">
                <p className="text-xs font-mono text-blue-300 uppercase tracking-widest mb-6 font-semibold">Ғылыми жетекші</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xl font-black">
                    А
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Аманов А.Н.</p>
                    <p className="text-blue-300 text-sm font-semibold">PhD, аға оқытушы</p>
                  </div>
                </div>
                <div className="pt-5 border-t border-white/15">
                  <p className="text-xs font-mono text-blue-300 uppercase tracking-widest mb-3 font-semibold">Университет</p>
                  <p className="text-white/90 text-sm font-medium">Халықаралық Қазақ-Түрік университеті<br />атындағы Қожа Ахмет Ясауи</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Team heading ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Tag color="text-blue-400">Команда</Tag>
            <h2 className="mt-4 text-4xl md:text-5xl font-black text-white">Біздің команда</h2>
            <p className="mt-4 text-white/70 text-lg font-medium">Топ АКИ-211</p>
          </motion.div>

          {/* ── Team cards ── */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '1', name: 'Хинизов Руслан',
                role: 'Python & FastAPI сарапшысы',
                desc: 'Backend архитектурасы, AI pipeline, Celery + Redis интеграциясы.',
                photo: '/LogoAndProFoto/image.png',
                accent: 'from-blue-500 to-indigo-600',
                border: 'border-blue-500/30',
                glow: 'shadow-blue-500/20',
                delay: 0,
              },
              {
                num: '2', name: 'Исаев Нұрбек',
                role: 'React & UI/UX дизайнері',
                desc: 'Фронтенд интерфейсі, анимациялар, пайдаланушы тəжірибесі.',
                photo: '/LogoAndProFoto/NurbekLogo.jpg',
                accent: 'from-violet-500 to-purple-600',
                border: 'border-violet-500/30',
                glow: 'shadow-violet-500/20',
                delay: 0.1,
              },
              {
                num: '3', name: 'Таліпхан Самат',
                role: 'Терең оқыту маманы',
                desc: 'DeOldify, CodeFormer модельдерін баптады және тестіледі.',
                photo: '/LogoAndProFoto/SamatLogo.jpg',
                accent: 'from-emerald-500 to-teal-600',
                border: 'border-emerald-500/30',
                glow: 'shadow-emerald-500/20',
                delay: 0.2,
              },
            ].map((m) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: m.delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`rounded-3xl border ${m.border} bg-white/6 backdrop-blur-md p-9 text-center group shadow-2xl ${m.glow}`}
              >
                {/* Photo */}
                <div className="relative inline-block mb-7">
                  <div className={`absolute -inset-3 rounded-full bg-gradient-to-br ${m.accent} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />
                  <img
                    src={m.photo} alt={m.name}
                    className="relative w-36 h-36 rounded-full object-cover object-top border-4 border-white/25 shadow-2xl"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br ${m.accent} flex items-center justify-center text-white text-sm font-black border-2 border-[#03071E] shadow-lg`}>
                    {m.num}
                  </span>
                </div>
                <h3 className="text-white font-black text-xl mb-1.5">{m.name}</h3>
                <p className="text-blue-300 text-base font-semibold mb-4">{m.role}</p>
                <div className={`w-10 h-0.5 bg-gradient-to-r ${m.accent} mx-auto mb-4 rounded-full`} />
                <p className="text-white/80 text-sm leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* PROBLEM                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-[#F8FAFF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-20"
          >
            <Tag color="text-rose-500">Мәселе</Tag>
            <h2 className="mt-4 text-5xl md:text-6xl font-black text-gray-900 leading-tight">
              Тарих жоғалып жатыр
            </h2>
            <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Жүздеген миллион тарихи фотосурет зақымданады, ал қара-ақ видеолар өзінің шынайылығын жоғалтады
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '100M+', label: 'Зақымдалған фотосурет', sub: 'Дүниежүзілік архивтерде', color: 'text-rose-500', delay: 0 },
              { num: '95%',   label: 'Қол жетімсіз',         sub: 'Мамандар мен ресурс жетіспеу', color: 'text-amber-500', delay: 0.08 },
              { num: '10×',  label: 'Қымбаттау',             sub: 'Қолмен реставрацияның бағасы', color: 'text-violet-500', delay: 0.16 },
              { num: '∞',    label: 'Тарихи маңыз',          sub: 'Жоғалтуға мүмкін емес',        color: 'text-blue-500',   delay: 0.24 },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: s.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`text-5xl font-black mb-3 ${s.color}`}>{s.num}</div>
                <div className="font-bold text-gray-900 mb-1.5 text-sm">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* AI MODELS                                             */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Tag color="text-violet-600">Шешім</Tag>
            <h2 className="mt-4 text-5xl md:text-6xl font-black text-gray-900">
              7 AI модель — бір платформа
            </h2>
            <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto">
              Дүниежүзілік деңгейдегі Deep Learning модельдері бір жүйеде біріктірілген
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {models.map((m) => <ModelCard key={m.name} {...m} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* PHOTO DEMO                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      <section id="demo-section" className="py-24 px-6 bg-[#F8FAFF]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <Tag color="text-blue-600">Нәтижелер</Tag>
            <h2 className="mt-4 text-4xl md:text-5xl font-black text-gray-900">
              Нақты нәтижелер
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-500 text-lg mb-16"
          >
            Слайдерді сүйреп, бұрын мен кейінді салыстырыңыз
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* ── Card 1: DDColor — Фото бояу ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-[560px] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/80 mb-4 bg-gray-950">
                <BeforeAfter
                  before="/demo/photo/processed_3b430fe0-d1e9-4ddf-b86a-6ed0667c3783.jpg"
                  after="/demo/photo/colorized_fe2610fb-422f-4062-b7fe-132d1da2dad0.jpg"
                />
              </div>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                  <Camera className="w-4 h-4" /> DDColor — Фотосуретті бояу
                </span>
              </div>
            </motion.div>

            {/* ── Card 2: SDXL — Зақым жөндеу ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-[560px] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/80 mb-4 bg-gray-950">
                <BeforeAfter
                  before="/demo/photo/face_with_piece_missing1.jpg"
                  after="/demo/photo/repaired_450f37dd-6ad7-4b72-b1cb-f9fd49c6ce6a.jpg"
                />
              </div>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold bg-violet-100 text-violet-700">
                  <Wand2 className="w-4 h-4" /> SDXL — Зақымды жөндеу
                </span>
              </div>
            </motion.div>

            {/* ── Card 3: Real-ESRGAN — Суперрезолюция ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-[560px] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/80 mb-4 bg-gray-950">
                <BeforeAfter
                  before="/demo/photo/a-young-woman-with-striking-features-is-focused-while-sitting-at-a-desk-in-a-bright-office-photo.jpg"
                  after="/demo/photo/enhanced_471ca445-edaa-42ef-b2a5-abaf8709709b.jpg"
                />
              </div>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                  <Maximize2 className="w-4 h-4" /> Real-ESRGAN — Суперрезолюция
                </span>
              </div>
            </motion.div>

            {/* ── Card 4: rembg — Фон жою ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-[560px] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/80 mb-4 bg-gray-950">
                <BeforeAfter
                  before="/demo/photo/how-to-convert-low-to-high-resolution-in-photoshop-10.jpg"
                  after="/demo/photo/bg_removed_7896ab86-d556-450d-bbbd-57e6cbdb8c45.jpg"
                />
              </div>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                  <Scissors className="w-4 h-4" /> rembg — Фонды жою
                </span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* VIDEO DEMO                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-[#03071E] relative overflow-hidden">
        <Orb color="w-[500px] h-[500px] bg-emerald-700/15" style={{ top: '-10%', right: '-5%' }}
          animate={{ x: [0, 40, 0] }} />
        <Orb color="w-[400px] h-[400px] bg-blue-700/10" style={{ bottom: '-5%', left: '5%' }}
          animate={{ y: [0, -30, 0] }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Tag color="text-emerald-400">Видео бояу</Tag>
            <h2 className="mt-4 text-5xl md:text-6xl font-black text-white">
              Тарихи видеоларды жаңарту
            </h2>
            <p className="mt-5 text-xl text-white/45 max-w-2xl mx-auto">
              DeOldify GAN моделі — кадр-кадр өңдеу, толық офлайн режімде жұмыс жасайды
            </p>
          </motion.div>

          <div className="space-y-6">

            {/* ── Result 1 ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-3xl overflow-hidden border border-white/8 bg-black/40"
            >
              <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white/70 text-sm font-semibold">Нәтиже 1 — Портрет видеосын бояу</span>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="relative bg-black">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide">
                    Бұрын — Қара-ақ
                  </span>
                  <video ref={v1bRef} src="/demo/video/7198924-hd_720_1280_25fps.mp4"
                    className="w-full h-72 object-contain" muted loop playsInline preload="metadata" />
                </div>
                <div className="relative bg-black border-l border-white/8">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-emerald-600/90 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide">
                    Кейін — DeOldify AI
                  </span>
                  <video ref={v1aRef} src="/demo/video/colorized_714e4234-19d6-4210-afa9-a1d0d60a38d2.mp4"
                    className="w-full h-72 object-contain" muted loop playsInline preload="metadata" />
                </div>
              </div>
            </motion.div>

            {/* ── Result 2 ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="rounded-3xl overflow-hidden border border-white/8 bg-black/40"
            >
              <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-white/70 text-sm font-semibold">Нәтиже 2 — Видеоны өңдеу</span>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="relative bg-black">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide">
                    Бұрын — Бастапқы
                  </span>
                  <video ref={v2bRef} src="/demo/video/15031830_2560_1440_30fps.mp4"
                    className="w-full h-72 object-contain" muted loop playsInline preload="metadata" />
                </div>
                <div className="relative bg-black border-l border-white/8">
                  <span className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-blue-600/90 backdrop-blur-sm rounded-lg text-white text-[11px] font-bold uppercase tracking-wide">
                    Кейін — AI өңделген
                  </span>
                  <video ref={v2aRef} src="/demo/video/processed_fa900d30-6bcc-43cf-89fa-56ae23fbe1ef.mp4"
                    className="w-full h-72 object-contain" muted loop playsInline preload="metadata" />
                </div>
              </div>
            </motion.div>

          </div>

          <div className="flex justify-center mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={toggleVideo}
              className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl ${
                playing
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
              }`}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {playing ? 'Барлығын тоқтату' : 'Барлығын ойнату'}
            </motion.button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* METRICS                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Tag color="text-blue-600">Мүмкіндіктер</Tag>
            <h2 className="mt-4 text-5xl md:text-6xl font-black text-gray-900">Жүйе мүмкіндіктері</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {results.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
                className="bg-gray-50 rounded-3xl p-8 text-center border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className={`text-6xl font-black bg-gradient-to-br ${r.gradient} bg-clip-text text-transparent mb-3`}>
                  <CountUp to={r.to} suffix={r.suffix} />
                </div>
                <div className="font-bold text-gray-900 text-base mb-1">{r.label}</div>
                <div className="text-xs text-gray-400">{r.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TECH STACK                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-[#F8FAFF]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Tag color="text-violet-600">Стек</Tag>
            <h2 className="mt-4 text-5xl font-black text-gray-900">Технологиялық стек</h2>
          </motion.div>

          <div className="space-y-4">
            {techStack.map((row, i) => (
              <motion.div
                key={row.layer}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-5 bg-white rounded-2xl px-6 py-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`shrink-0 w-28 ${row.color} text-white text-sm font-bold rounded-xl px-3 py-2.5 text-center`}>
                  {row.layer}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.items.map((item) => (
                    <span key={item} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURES CHECKLIST                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Tag color="text-emerald-600">Нәтижелер</Tag>
            <h2 className="mt-4 text-5xl font-black text-gray-900">Жүйе нәтижелері</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              '7 AI модель бір платформада іске қосылған',
              'Толық офлайн жұмыс — интернет қажет емес',
              'Нақты уақытта өңдеу прогресі (WebSocket)',
              '4 тілде толық локализация',
              'Before/After салыстырмалы slider UI',
              'Admin панель — пайдаланушы басқару',
              'Барлық модельдер тексерілді және жұмыс жасайды',
              'Celery + Redis асинхронды тапсырмалар кезегі',
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
              >
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-gray-800">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* CLOSING                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="relative py-40 px-6 bg-[#03071E] overflow-hidden">
        <Orb color="w-[700px] h-[700px] bg-blue-600/20" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
          animate={{ scale: [1, 1.15, 1] }} />
        <Orb color="w-[400px] h-[400px] bg-violet-600/15" style={{ top: '-10%', right: '-5%' }}
          animate={{ x: [0, 60, 0], y: [0, -30, 0] }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 mb-10 shadow-2xl shadow-blue-600/40"
            >
              <img src="/LogoAndProFoto/ayu_logo.png" alt="AYU" className="w-16 h-16 object-contain" />
            </motion.div>

            <h2 className="font-black leading-none tracking-tight mb-6">
              <span className="block text-white text-6xl md:text-8xl">AYU</span>
              <span className="block text-6xl md:text-8xl bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                ColorizeX
              </span>
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
              {[
                { num: '1', name: 'Хинизов Руслан',   color: 'bg-blue-600' },
                { num: '2', name: 'Исаев Нұрбек',      color: 'bg-violet-600' },
                { num: '3', name: 'Таліпхан Самат',    color: 'bg-emerald-600' },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm">
                  <span className={`w-6 h-6 rounded-full ${s.color} flex items-center justify-center text-white text-[10px] font-black shrink-0`}>{s.num}</span>
                  <span className="text-white font-semibold text-sm">{s.name}</span>
                </div>
              ))}
            </div>
            <p className="text-white/55 text-sm mb-2">
              Ғылыми жетекші: <span className="text-white/80 font-semibold">Аманов А.Н., PhD, аға оқытушы</span>
            </p>
            <p className="text-white/35 text-sm mb-12">
              Дипломдық жоба қорғауы  •  АКИ-211  •  Ахмет Ясауи университеті  •  16.06.2026
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/photo"
                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-2xl shadow-blue-500/30"
              >
                Жүйені ашу <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/"
                className="px-10 py-4 border border-white/15 bg-white/5 text-white/70 rounded-2xl font-bold text-lg flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <Home className="w-5 h-5" /> Басты бетке
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
