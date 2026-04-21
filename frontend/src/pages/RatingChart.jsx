import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Users } from 'lucide-react';

const RatingChart = ({ stats, total, average, darkMode }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    setAnimated(true);
  }, []);

  const ratings = [
    { stars: 5, count: stats[5] || 0, color: 'from-emerald-400 to-green-500', bgLight: 'bg-emerald-50', bgDark: 'dark:bg-emerald-950/30' },
    { stars: 4, count: stats[4] || 0, color: 'from-green-400 to-teal-500', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-950/30' },
    { stars: 3, count: stats[3] || 0, color: 'from-yellow-400 to-amber-500', bgLight: 'bg-yellow-50', bgDark: 'dark:bg-yellow-950/30' },
    { stars: 2, count: stats[2] || 0, color: 'from-orange-400 to-orange-500', bgLight: 'bg-orange-50', bgDark: 'dark:bg-orange-950/30' },
    { stars: 1, count: stats[1] || 0, color: 'from-red-400 to-rose-500', bgLight: 'bg-red-50', bgDark: 'dark:bg-red-950/30' }
  ];

  const maxCount = Math.max(...ratings.map(r => r.count), 1);

  const getPercentage = (count) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-2 border-gray-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl"
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl">
            <TrendingUp size={18} className="text-white" />
          </div>
          <h3 className="font-black text-sm uppercase tracking-wider text-gray-600 dark:text-slate-400">
            Статистика оценок
          </h3>
        </div>
        
        {/* Общая статистика */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400 dark:text-slate-500" />
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
              {total} {total === 1 ? 'ГОЛОС' : total >= 2 && total <= 4 ? 'ГОЛОСА' : 'ГОЛОСОВ'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-full border border-yellow-200 dark:border-yellow-800/30">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-lg font-black text-gray-900 dark:text-white">
              {average.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">/5</span>
          </div>
        </div>
      </div>

      {/* Диаграмма */}
      <div className="space-y-3">
        {ratings.map((rating, index) => (
          <motion.div
            key={rating.stars}
            initial={{ opacity: 0, x: -20 }}
            animate={animated ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group"
            onMouseEnter={() => setHoveredBar(rating.stars)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <div className="flex items-center gap-3">
              {/* Звёзды */}
              <div className="flex items-center gap-1 w-16">
                <span className="text-xs font-black text-gray-500 dark:text-slate-400 w-4">
                  {rating.stars}
                </span>
                <Star 
                  size={14} 
                  className="text-yellow-500 fill-yellow-500" 
                />
              </div>

              {/* Прогресс бар */}
              <div className="flex-1">
                <div className={`relative h-8 rounded-xl overflow-hidden ${rating.bgLight} ${rating.bgDark} border border-gray-200/50 dark:border-slate-700/50`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={animated ? { width: `${getPercentage(rating.count)}%` } : { width: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${rating.color} shadow-lg`}
                  />
                  
                  {/* Лейбл с процентом */}
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 z-10">
                      {rating.count}
                    </span>
                    <AnimatePresence>
                      {(hoveredBar === rating.stars || hoveredBar === null) && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-xs font-black text-gray-600 dark:text-slate-400 z-10"
                        >
                          {getPercentage(rating.count).toFixed(1)}%
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Футер с дополнительной информацией */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-800/30 rounded-xl">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {ratings.find(r => r.count === maxCount)?.stars || '-'}
              </div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
                Самая частая
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-800/30 rounded-xl">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {((stats[5] || 0) + (stats[4] || 0))}
              </div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">
                Положительных
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default RatingChart;